// MILFT Tournois V2 — MAJ71. Démonstrateur autonome, jamais lié à la V1.1.
import {firebaseConfig} from './firebase-config.mjs';
const $=id=>document.getElementById(id);
const valid=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const uidValid=/^[A-Za-z0-9_-]{1,128}$/;
const state={api:null,auth:null,db:null,user:null,outbox:null,scope:null,trial:null,role:null,match:null,unsubscribe:null,unsubscribeMember:null,deviceId:null,sending:false,enqueuing:false,roomGeneration:0,recoveryTimer:null,draftDirty:false,draftBaseVersion:null};
function status(msg,tone=''){const e=$('status');e.textContent=msg;e.className=tone;}
function log(s){const e=$('log');e.textContent=(new Date().toLocaleTimeString('fr-FR')+' · '+s+'\n'+e.textContent).slice(0,3000)}
function errorText(e){return String(e?.code||e?.message||e||'Erreur').slice(0,200)}
function resetRoom(){state.roomGeneration++;clearTimeout(state.recoveryTimer);state.recoveryTimer=null;state.sending=false;state.enqueuing=false;state.unsubscribe?.();state.unsubscribe=null;state.unsubscribeMember?.();state.unsubscribeMember=null;state.trial=null;state.match=null;state.role=null;state.scope=null;state.outbox?.close();state.outbox=null;state.draftDirty=false;state.draftBaseVersion=null;$('score').textContent='— : —';$('version').textContent='Version distante inconnue';$('home').value=0;$('away').value=0;$('demo').hidden=true;$('sharing').hidden=true;$('roomNotice').textContent='';$('inviteNotice').textContent='';}
function updateUI(){
  $('rooms').hidden=!state.user;
  $('signIn').hidden=!!state.user;$('signOut').hidden=!state.user;
  $('who').value=state.user?.uid||'Non connecté';
  $('role').textContent=state.role==='admin'?'Propriétaire':state.role==='editor'?'Autorisé à saisir':state.role==='viewer'?'Lecture seule':'Non autorisé';
  $('send').disabled=!['admin','editor'].includes(state.role)||!state.match||state.match.status!=='playing'||!state.outbox||state.sending||state.enqueuing;
  $('retry').disabled=!['admin','editor'].includes(state.role)||!state.outbox||state.sending;
  $('invite').disabled=state.role!=='admin';$('revoke').disabled=state.role!=='admin';
  $('copyUid').disabled=!state.user;
  $('copyTrial').disabled=!state.trial;
  $('copyLink').disabled=!state.trial;
}
function newId(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join('');}
function trialLink(id){
 const url=new URL('./mobile-demo.html',window.location.href);
 url.searchParams.set('essai',id);
 return url.href;
}
async function copyText(value,label,field,noticeId){
 try{
  if(!navigator.clipboard?.writeText)throw Error('Presse-papiers indisponible');
  await navigator.clipboard.writeText(value);
  status(label+' copié.','good');
  if(noticeId){const e=$(noticeId);e.textContent=label+' copié.';e.className='inline-status good';}
 }catch(e){
  if(field){field.value=value;field.focus();field.select();}
  status('Copie automatique indisponible. Le texte est sélectionné : utiliser Copier.','error');
  if(noticeId){const e=$(noticeId);e.textContent='Copie automatique indisponible : utiliser Copier sur le texte sélectionné.';e.className='inline-status error';}
 }
}
function fingerprint(c){return JSON.stringify([c.tournamentId,c.matchId,c.actorId,c.deviceId,c.expectedVersion,c.setIndex,c.goals.a,c.goals.b]);}
// L'identifiant V2 doit survivre à la fermeture du navigateur : sessionStorage
// seul rendrait les brouillons IndexedDB inaccessibles à la réouverture.
const DEVICE_KEY='MILFT_V2_DEMO_DEVICE_ID';
const LAST_TRIAL_KEY='MILFT_V2_DEMO_LAST_TRIAL';
function persistentDeviceId(){
  let value=localStorage.getItem(DEVICE_KEY);
  if(!value||!valid.test(value)){
    value='device'+newId();
    localStorage.setItem(DEVICE_KEY,value);
  }
  if(localStorage.getItem(DEVICE_KEY)!==value)throw Error('Stockage local V2 non fiable');
  return value;
}
function syncScore(){
 if(!state.match){$('score').textContent='— : —';$('version').textContent='Version distante inconnue';return;}
 const x=state.match.sets?.['0'];
 $('score').textContent=(x?.a??'—')+' : '+(x?.b??'—');
 $('version').textContent='Version distante '+state.match.version+' · Dernier événement '+(state.match.lastEventId||'inconnu');
 if(!state.draftDirty){
   $('home').value=x?.a??0;$('away').value=x?.b??0;state.draftBaseVersion=null;
 }
}
// Un bail « sending » ou une erreur réseau temporaire peut survivre à
// la fermeture du navigateur. La reprise n'anticipe jamais les délais.
function scheduleLeaseRecovery(items,context){
 clearTimeout(state.recoveryTimer);state.recoveryTimer=null;
 if(state.roomGeneration!==context.generation||state.outbox!==context.outbox||
    !navigator.onLine||!['admin','editor'].includes(state.role)||state.sending)return;
 const head=items.find(item=>item.state==='pending'||item.state==='sending');
 if(!head)return;
 const deadline=head.state==='sending'?head.leaseUntil:head.retryAt;
 if(!Number.isFinite(deadline)||deadline<=0)return;
 const ms=Math.max(250,Math.min(300000,deadline-Date.now()+150));
 state.recoveryTimer=setTimeout(()=>{
   state.recoveryTimer=null;
   if(state.roomGeneration!==context.generation||state.outbox!==context.outbox||
      state.scope!==context.scope||!navigator.onLine||!['admin','editor'].includes(state.role))return;
   void transmit();
 },ms);
}
async function refreshQueue(){
 if(!state.outbox||!state.scope)return;
 const countsFromScope={outbox:state.outbox,scope:state.scope,generation:state.roomGeneration};
 const items=await countsFromScope.outbox.list(countsFromScope.scope);
 if(state.roomGeneration!==countsFromScope.generation||state.outbox!==countsFromScope.outbox)return;
 const counts={pending:0,sending:0,conflict:0,blocked:0};
 for(const x of items)counts[x.state]=(counts[x.state]||0)+1;
 const head=items.find(x=>x.state==='pending'||x.state==='sending');
 const scheduled=head&&navigator.onLine&&['admin','editor'].includes(state.role)&&
   ((head.state==='sending'&&head.leaseUntil>Date.now())||
    (head.state==='pending'&&head.retryAt>Date.now()));
 $('queue').textContent='File locale persistante : '+counts.pending+' en attente, '+counts.sending+' en cours, '+counts.conflict+' conflit(s), '+counts.blocked+' refusé(s)'+(scheduled&&!state.sending?' · Reprise automatique après le délai de sécurité':'');
 $('conflicts').textContent=items.filter(x=>x.state==='conflict'||x.state==='blocked').map(x=>'Événement '+x.command.id+' conservé : '+x.state+' ('+(x.reason||'')+')').join(' · ');
 scheduleLeaseRecovery(items,countsFromScope);
}
async function prepareRoom(trialId){
 if(!state.user||!valid.test(trialId)){status('Code de salle invalide.','error');return;}
 resetRoom();
 const base='v2Trials/'+trialId,uid=state.user.uid,api=state.api,db=state.db,generation=state.roomGeneration;
 const isCurrent=()=>state.roomGeneration===generation&&state.user?.uid===uid;
 try{
   const owner=await api.get(api.ref(db,base+'/ownerUid'));
   if(!isCurrent())return;
   if(!owner.exists())throw Error('Salle introuvable ou non autorisée');
   let role=owner.val()===uid?'admin':null;
   if(!role){const membership=await api.get(api.ref(db,base+'/members/'+uid));if(!isCurrent())return;role=membership.val();}
   if(!['admin','editor','viewer'].includes(role))throw Error('Ce compte n’a pas été autorisé par le propriétaire');
   const dbName='MILFT_V2_DEMO_OUTBOX_20261120';
   const outbox=await window.MILFTV2Outbox.open({indexedDB:window.indexedDB,dbName});
   if(!isCurrent()){outbox.close();return;}
   state.trial=trialId;state.role=role;state.outbox=outbox;
   state.scope={tournamentId:trialId,actorId:uid,deviceId:state.deviceId};
   $('trialId').value=trialId;
   $('demo').hidden=false;$('sharing').hidden=role!=='admin';updateUI();
   localStorage.setItem(LAST_TRIAL_KEY,trialId);
   state.unsubscribe=api.onValue(api.ref(db,base+'/matches/demo'),snapshot=>{
      if(!isCurrent()||state.trial!==trialId)return;
      state.match=snapshot.val();syncScore();$('net').textContent='Écoute Firebase active';updateUI();
   },e=>{
      if(!isCurrent()||state.trial!==trialId)return;
      resetRoom();updateUI();
      status(errorText(e).toLowerCase().replaceAll('_','-').includes('permission-denied')?'Accès retiré ou refusé par Firebase. Le match est masqué et la file locale reste conservée.':'Lecture du match interrompue : '+errorText(e)+'. La file locale reste conservée.','error');
   });
   // L'écoute du score seule ne suffit pas pour retirer immédiatement le contenu
   // lorsqu'un propriétaire modifie les droits : suivre l'UID autorisé lui-même.
   if(role!=='admin'){
     state.unsubscribeMember=api.onValue(api.ref(db,base+'/members/'+uid),snapshot=>{
       if(!isCurrent()||state.trial!==trialId)return;
       const fresh=snapshot.val();
       if(fresh!=='editor'&&fresh!=='viewer'){
         resetRoom();updateUI();
         status('Accès retiré par le propriétaire. Les opérations en file locale sont conservées.','error');
         return;
       }
       if(fresh!==state.role){
         state.role=fresh;updateUI();
         status(fresh==='viewer'?'Accès passé en lecture seule. Saisie désactivée.':'Autorisation de saisie rétablie.','good');
       }
     },e=>{
       if(!isCurrent()||state.trial!==trialId)return;
       resetRoom();updateUI();
       status('Contrôle des autorisations indisponible : '+errorText(e)+'. La file locale reste conservée.','error');
     });
   }
   await refreshQueue();
   if(!isCurrent())return;
   if(navigator.onLine&&state.role!=='viewer')void transmit();
   status('Essai '+trialId+' ouvert · '+(state.role==='viewer'?'lecture seule':state.role==='admin'?'propriétaire':'saisie autorisée'),'good');
 }catch(e){if(isCurrent()){resetRoom();updateUI();status('Accès à l’essai impossible : '+errorText(e),'error');}}
}
async function createRoom(){
 if(!state.user)return;
 const id='trial'+newId(),uid=state.user.uid;
 const match={version:0,status:'playing',sets:{'0':{a:0,b:0}},updatedBy:uid,lastEventId:'seed',lastEventFingerprint:'seed'};
 const trial={ownerUid:uid,demoOnly:true,createdAt:Date.now(),matches:{demo:match}};
 try{
  await state.api.set(state.api.ref(state.db,'v2Trials/'+id),trial);
  log('Création de la salle fictive validée par le serveur');
  if(state.user?.uid===uid)await prepareRoom(id);
 }catch(e){status('Création refusée par Firebase : '+errorText(e),'error');}
}
async function execute(command){
 const api=state.api,db=state.db,uid=state.user?.uid;
 if(!uid||uid!==command.actorId)return {status:'forbidden'};
 const path='v2Trials/'+command.tournamentId+'/matches/'+command.matchId;
 const reference=api.ref(db,path),fp=fingerprint(command);
 let stateCode='conflict';
 let unsubscribe=()=>{};
 try{
  unsubscribe=api.onValue(reference,()=>{},()=>{});
  const initial=await api.get(reference);
  if(!initial.exists())return {status:'missing-match'};
  const result=await api.runTransaction(reference,match=>{
   if(!match||typeof match!=='object'){stateCode='missing-match';return;}
   if(match.lastEventId===command.id){stateCode=match.lastEventFingerprint===fp?'duplicate':'id-collision';return;}
   if(match.version!==command.expectedVersion){stateCode='conflict';return;}
   if(match.status!=='playing'){stateCode='closed-match';return;}
   const updated={...match,sets:{...match.sets,[String(command.setIndex)]:command.goals},version:match.version+1,
     updatedBy:uid,lastEventId:command.id,lastEventFingerprint:fp};
   stateCode='proposed';return updated;
  },{applyLocally:false});
  const saved=result.snapshot?.val();
  if(result.committed&&saved?.lastEventId===command.id&&saved?.lastEventFingerprint===fp&&saved?.version===command.expectedVersion+1)return {status:'applied'};
  if(saved?.lastEventId===command.id)return {status:saved.lastEventFingerprint===fp?'duplicate':'id-collision'};
  return {status:stateCode==='proposed'?'conflict':stateCode};
 }catch(e){
  const msg=errorText(e).toLowerCase().replaceAll('_','-');
  return {status:msg.includes('permission-denied')?'forbidden':'unavailable'};
 }finally{unsubscribe();}
}
async function transmit({manual=false}={}){
 if(!state.scope||!state.outbox||!state.user||!['admin','editor'].includes(state.role)||state.sending)return;
 const scope=state.scope,outbox=state.outbox,uid=state.user.uid,generation=state.roomGeneration;
 const sameRoom=()=>state.roomGeneration===generation&&state.outbox===outbox&&state.scope===scope&&state.user?.uid===uid;
 state.sending=true;updateUI();
 try{
  for(let i=0;i<15;i++){
   if(!sameRoom()||!['admin','editor'].includes(state.role)||!navigator.onLine)break;
   const item=await outbox.claimNext(scope,{ignoreRetryAt:manual&&i===0});
   if(!item)break;
   if(!sameRoom()||!['admin','editor'].includes(state.role))break;
   const result=await execute(item.command);
   const outcome=result.status==='applied'||result.status==='duplicate'?result.status:
    ['conflict','closed-match','missing-match','invalid-transition'].includes(result.status)?'conflict':
    result.status==='forbidden'||result.status==='id-collision'?'forbidden':'temporary-error';
   const retryAfterMs=outcome==='temporary-error'?Math.min(60000,2000*2**Math.min(item.attempts-1,5)):0;
   const saved=await outbox.finish(scope,item.command.id,item.leaseToken,outcome,{reason:result.status,retryAfterMs});
   if(!sameRoom())break;
   if(outcome==='temporary-error'){status('Envoi non confirmé. Score conservé localement ; nouvelle tentative automatique après délai.','error');break;}
   if(outcome==='conflict'){
    const message=result.status==='closed-match'?'Match fictif terminé : score local conservé, aucun renvoi automatique.':
     result.status==='missing-match'?'Match fictif introuvable : score local conservé, aucun renvoi automatique.':
     'Conflit : un autre appareil a modifié ce score. Brouillon conservé.';
    status(message,'error');
   }
   if(outcome==='forbidden'){status('Accès refusé. Brouillon conservé, aucune modification distante.','error');break;}
   if(saved.status==='confirmed')status('Score fictif confirmé par Firebase.','good');
  }
  if(sameRoom())await refreshQueue();
 }catch(e){if(sameRoom())status('Erreur de file locale : '+errorText(e)+' — aucune suppression automatique','error');}
 finally{if(sameRoom()){state.sending=false;updateUI();void refreshQueue();}}
}
async function sendScore(){
 if(!state.match||state.match.status!=='playing'||!state.outbox||!['admin','editor'].includes(state.role)||!state.user||state.enqueuing||state.sending)return;
 const rawA=$('home').value.trim(),rawB=$('away').value.trim();
 if(!/^\d{1,2}$/.test(rawA)||!/^\d{1,2}$/.test(rawB)){status('Buts invalides : renseigner les deux scores entiers de 0 à 99.','error');return;}
 const a=Number(rawA),b=Number(rawB);
 // Le numéro de génération et la portée empêchent un acquittement tardif de
 // modifier l'interface d'une autre salle ou d'un autre compte Google.
 const outbox=state.outbox,scope=state.scope,uid=state.user.uid,generation=state.roomGeneration;
 const sameRoom=()=>state.roomGeneration===generation&&state.outbox===outbox&&state.scope===scope&&state.user?.uid===uid;
 const command={...scope,id:'e'+newId(),matchId:'demo',type:'set.record',expectedVersion:state.draftDirty&&state.draftBaseVersion!==null?state.draftBaseVersion:state.match.version,setIndex:0,goals:{a,b}};
 state.enqueuing=true;updateUI();
 try{
  const result=await outbox.enqueue(scope,command,Date.now(),{chainLocalScore:true});
  if(!sameRoom())return; // Les événements confirmés restent dans leur file IndexedDB d'origine.
  if(result.status!=='queued'&&result.status!=='duplicate'){status('Ajout local non confirmé : '+result.status,'error');return;}
  state.draftDirty=false;state.draftBaseVersion=null;
  await refreshQueue();
  if(!sameRoom())return;
  if(!['admin','editor'].includes(state.role)){
    status('Score fictif conservé dans la file locale. Droits de saisie retirés : aucun envoi.','error');
    return;
  }
  status('Score fictif enregistré localement. Envoi en cours…');
  if(navigator.onLine)await transmit();
  else status('Hors connexion : score conservé localement.','error');
 }catch(e){if(sameRoom())status('Sauvegarde locale impossible : ne pas quitter avant résolution. '+errorText(e),'error');}
 finally{if(sameRoom()){state.enqueuing=false;updateUI();}}
}
function inviteFeedback(message,tone){const e=$('inviteNotice');e.textContent=message;e.className='inline-status '+tone;status(message,tone);}
async function manageUser(revoke=false){
 if(state.role!=='admin'||!state.trial)return;
 const uid=$('invited').value.trim();
 if(!uidValid.test(uid)||uid===state.user.uid){inviteFeedback('UID du second compte invalide.','error');return;}
 try{
  const path='v2Trials/'+state.trial+'/members/'+uid;
  if(revoke)await state.api.remove(state.api.ref(state.db,path));
  else await state.api.set(state.api.ref(state.db,path),$('permission').value);
  inviteFeedback(revoke?'Accès révoqué.':'Utilisateur autorisé. Il peut ouvrir le code de salle sur son appareil.','good');
 }catch(e){inviteFeedback('Modification des droits refusée : '+errorText(e),'error');}
}
async function initialize(){
 try{
  state.deviceId=persistentDeviceId();
  const linkTrial=new URLSearchParams(location.search).get('essai');
  const savedTrial=localStorage.getItem(LAST_TRIAL_KEY);
  if(linkTrial&&/^trial[a-f0-9]{24}$/.test(linkTrial))$('trialId').value=linkTrial;
  else if(savedTrial&&valid.test(savedTrial))$('trialId').value=savedTrial;
 }catch(e){status('Stockage local V2 indisponible : sauvegarde des scores impossible. '+errorText(e),'error');return;}
 window.addEventListener('online',()=>{if(state.user&&state.scope&&['admin','editor'].includes(state.role))void transmit();});
 window.addEventListener('offline',()=>{clearTimeout(state.recoveryTimer);state.recoveryTimer=null;});
 for(const id of ['home','away'])$(''+id).addEventListener('input',()=>{if(!state.draftDirty){state.draftDirty=true;state.draftBaseVersion=state.match?.version??null;}});
 $('copyUid').onclick=()=>{if(state.user)void copyText(state.user.uid,'Identifiant',$('who'));};
 $('copyTrial').onclick=()=>{if(state.trial)void copyText(state.trial,'Code de salle',$('trialId'),'roomNotice');};
 $('copyLink').onclick=()=>{if(state.trial)void copyText(trialLink(state.trial),'Lien de partage',$('trialId'),'roomNotice');};
 $('create').onclick=createRoom;
 $('join').onclick=()=>prepareRoom($('trialId').value.trim());
 $('send').onclick=sendScore;
 $('retry').onclick=()=>transmit({manual:true});
 $('invite').onclick=()=>manageUser(false);
 $('revoke').onclick=()=>manageUser(true);
 $('signOut').onclick=async()=>{if(state.api&&state.auth)await state.api.signOut(state.auth);};
 if(!firebaseConfig||!['apiKey','authDomain','databaseURL','projectId','appId'].every(key=>typeof firebaseConfig[key]==='string'&&firebaseConfig[key].length)){
    status('Projet Firebase non configuré — aucun partage réel actif.','error');
    log('Prototype prêt pour la configuration Firebase Spark. La V1.1 reste indépendante.');
    return;
 }
 try{
  const version='12.6.0';
  const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut},{getDatabase,ref,get,set,remove,onValue,runTransaction}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-database.js')
  ]);
  const app=initializeApp(firebaseConfig,'milft-v2-demo');
  state.auth=getAuth(app);state.db=getDatabase(app);
  state.api={ref,get,set,remove,onValue,runTransaction,signOut};
  $('signIn').disabled=false;
  $('signIn').onclick=async()=>{
    try{await signInWithPopup(state.auth,new GoogleAuthProvider());}
    catch(e){status('Connexion Google impossible : '+errorText(e)+'. Vérifier les domaines autorisés et la fenêtre de connexion.','error');}
  };
  onAuthStateChanged(state.auth,user=>{
    resetRoom();state.user=user;updateUI();
    if(user)status('Connecté. Créer un match fictif ou saisir un code de salle.','good');
    else status('Connexion Google nécessaire pour démarrer le partage fictif.');
  },e=>status('Session Firebase indisponible : '+errorText(e),'error'));
 }catch(e){status('SDK Firebase inaccessible : '+errorText(e),'error');}
}
initialize();
