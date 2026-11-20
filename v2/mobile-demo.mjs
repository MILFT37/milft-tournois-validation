// MILFT Tournois V2 — MAJ71. Démonstrateur autonome, jamais lié à la V1.1.
import {firebaseConfig} from './firebase-config.mjs';
const $=id=>document.getElementById(id);
const valid=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const uidValid=/^[A-Za-z0-9_-]{1,128}$/;
const state={api:null,auth:null,db:null,user:null,outbox:null,scope:null,trial:null,role:null,match:null,unsubscribe:null,deviceId:null,sending:false,draftDirty:false,draftBaseVersion:null};
function status(msg,tone=''){const e=$('status');e.textContent=msg;e.className=tone;}
function log(s){const e=$('log');e.textContent=(new Date().toLocaleTimeString('fr-FR')+' · '+s+'\n'+e.textContent).slice(0,3000)}
function errorText(e){return String(e?.code||e?.message||e||'Erreur').slice(0,200)}
function resetRoom(){state.unsubscribe?.();state.unsubscribe=null;state.trial=null;state.match=null;state.role=null;state.scope=null;state.outbox?.close();state.outbox=null;state.draftDirty=false;state.draftBaseVersion=null;$('demo').hidden=true;$('sharing').hidden=true;}
function updateUI(){
  $('rooms').hidden=!state.user;
  $('signIn').hidden=!!state.user;$('signOut').hidden=!state.user;
  $('who').value=state.user?.uid||'Non connecté';
  $('role').textContent=state.role==='admin'?'Propriétaire':state.role==='editor'?'Autorisé à saisir':state.role==='viewer'?'Lecture seule':'Non autorisé';
  $('send').disabled=state.role==='viewer'||!state.match||!state.outbox||state.sending;
  $('retry').disabled=state.role==='viewer'||!state.outbox||state.sending;
  $('invite').disabled=state.role!=='admin';$('revoke').disabled=state.role!=='admin';
}
function newId(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join('');}
function fingerprint(c){return JSON.stringify([c.tournamentId,c.matchId,c.actorId,c.deviceId,c.expectedVersion,c.setIndex,c.goals.a,c.goals.b]);}
function syncScore(){
 if(!state.match){$('score').textContent='— : —';$('version').textContent='Version distante inconnue';return;}
 const x=state.match.sets?.['0'];
 $('score').textContent=(x?.a??'—')+' : '+(x?.b??'—');
 $('version').textContent='Version distante '+state.match.version+' · Dernier événement '+(state.match.lastEventId||'inconnu');
 if(!state.draftDirty){
   $('home').value=x?.a??0;$('away').value=x?.b??0;state.draftBaseVersion=null;
 }
}
async function refreshQueue(){
 if(!state.outbox||!state.scope)return;
 const items=await state.outbox.list(state.scope);
 const counts={pending:0,sending:0,conflict:0,blocked:0};
 for(const x of items)counts[x.state]=(counts[x.state]||0)+1;
 $('queue').textContent='File locale persistante : '+counts.pending+' en attente, '+counts.sending+' en cours, '+counts.conflict+' conflit(s), '+counts.blocked+' refusé(s)';
 $('conflicts').textContent=items.filter(x=>x.state==='conflict'||x.state==='blocked').map(x=>'Événement '+x.command.id+' conservé : '+x.state+' ('+(x.reason||'')+')').join(' · ');
}
async function prepareRoom(trialId){
 if(!state.user||!valid.test(trialId)){status('Code de salle invalide.','error');return;}
 resetRoom();
 const base='v2Trials/'+trialId,uid=state.user.uid,api=state.api,db=state.db;
 try{
   const owner=await api.get(api.ref(db,base+'/ownerUid'));
   if(!owner.exists())throw Error('Salle introuvable ou non autorisée');
   let role=owner.val()===uid?'admin':null;
   if(!role){const membership=await api.get(api.ref(db,base+'/members/'+uid));role=membership.val();}
   if(!['admin','editor','viewer'].includes(role))throw Error('Ce compte n’a pas été autorisé par le propriétaire');
   const dbName='MILFT_V2_DEMO_OUTBOX_20261120';
   const outbox=await window.MILFTV2Outbox.open({indexedDB:window.indexedDB,dbName});
   state.trial=trialId;state.role=role;state.outbox=outbox;
   state.scope={tournamentId:trialId,actorId:uid,deviceId:state.deviceId};
   $('trialId').value=trialId;
   $('demo').hidden=false;$('sharing').hidden=role!=='admin';updateUI();
   state.unsubscribe=api.onValue(api.ref(db,base+'/matches/demo'),snapshot=>{
      state.match=snapshot.val();syncScore();$('net').textContent='Écoute Firebase active';updateUI();
   },e=>{state.match=null;$('net').textContent='Écoute indisponible';updateUI();status('Lecture du match refusée : '+errorText(e),'error');});
   await refreshQueue();
   status('Essai '+trialId+' ouvert · '+(role==='viewer'?'lecture seule':role==='admin'?'propriétaire':'saisie autorisée'),'good');
 }catch(e){resetRoom();updateUI();status('Accès à l’essai impossible : '+errorText(e),'error');}
}
async function createRoom(){
 if(!state.user)return;
 const id='trial'+newId(),uid=state.user.uid;
 const match={version:0,status:'playing',sets:{'0':{a:0,b:0}},updatedBy:uid,lastEventId:'seed',lastEventFingerprint:'seed'};
 const trial={ownerUid:uid,demoOnly:true,createdAt:Date.now(),matches:{demo:match}};
 try{
  await state.api.set(state.api.ref(state.db,'v2Trials/'+id),trial);
  log('Création de la salle fictive validée par le serveur');
  await prepareRoom(id);
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
  if(!initial.exists())return {status:'unavailable'};
  const result=await api.runTransaction(reference,match=>{
   if(!match||typeof match!=='object'){stateCode='unavailable';return;}
   if(match.lastEventId===command.id){stateCode=match.lastEventFingerprint===fp?'duplicate':'id-collision';return;}
   if(match.version!==command.expectedVersion){stateCode='conflict';return;}
   if(match.status!=='playing'){stateCode='invalid-transition';return;}
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
async function transmit(){
 if(!state.scope||!state.outbox||!state.user||state.sending)return;
 state.sending=true;updateUI();
 try{
  for(let i=0;i<15;i++){
   const item=await state.outbox.claimNext(state.scope);
   if(!item)break;
   const result=await execute(item.command);
   const outcome=result.status==='applied'||result.status==='duplicate'?result.status:
    result.status==='conflict'?'conflict':
    result.status==='forbidden'||result.status==='id-collision'?'forbidden':'temporary-error';
   const saved=await state.outbox.finish(state.scope,item.command.id,item.leaseToken,outcome,{reason:result.status});
   if(outcome==='temporary-error'){status('Envoi non confirmé. La modification est conservée localement.','error');break;}
   if(outcome==='conflict'){status('Conflit : un autre appareil a modifié ce score. Brouillon conservé.','error');}
   if(outcome==='forbidden'){status('Accès refusé. Brouillon conservé, aucune modification distante.','error');break;}
   if(saved.status==='confirmed')status('Score fictif confirmé par Firebase.','good');
  }
  await refreshQueue();
 }catch(e){status('Erreur de file locale : '+errorText(e)+' — aucune suppression automatique','error');}
 finally{state.sending=false;updateUI();}
}
async function sendScore(){
 if(!state.match||!state.outbox||state.role==='viewer'||!state.user)return;
 const a=Number($('home').value),b=Number($('away').value);
 if(![a,b].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=99)){status('Buts invalides (0 à 99).','error');return;}
 const s=state.scope;
 const command={...s,id:'e'+newId(),matchId:'demo',type:'set.record',expectedVersion:state.draftDirty&&state.draftBaseVersion!==null?state.draftBaseVersion:state.match.version,setIndex:0,goals:{a,b}};
 try{
  const result=await state.outbox.enqueue(s,command);
  if(result.status!=='queued'&&result.status!=='duplicate'){status('Ajout local non confirmé : '+result.status,'error');return;}
  state.draftDirty=false;state.draftBaseVersion=null;
  status('Score fictif enregistré localement. Envoi en cours…');
  await refreshQueue();
  if(navigator.onLine)await transmit();else status('Hors connexion : score conservé localement.','error');
 }catch(e){status('Sauvegarde locale impossible : ne pas quitter avant résolution. '+errorText(e),'error');}
}
async function manageUser(revoke=false){
 if(state.role!=='admin'||!state.trial)return;
 const uid=$('invited').value.trim();
 if(!uidValid.test(uid)||uid===state.user.uid){status('UID du second compte invalide.','error');return;}
 try{
  const path='v2Trials/'+state.trial+'/members/'+uid;
  if(revoke)await state.api.remove(state.api.ref(state.db,path));
  else await state.api.set(state.api.ref(state.db,path),$('permission').value);
  status(revoke?'Accès révoqué.':'Utilisateur autorisé. Il peut ouvrir le code de salle sur son appareil.','good');
 }catch(e){status('Modification des droits refusée : '+errorText(e),'error');}
}
async function initialize(){
 for(const id of ['home','away'])$(''+id).addEventListener('input',()=>{if(!state.draftDirty){state.draftDirty=true;state.draftBaseVersion=state.match?.version??null;}});
 $('create').onclick=createRoom;
 $('join').onclick=()=>prepareRoom($('trialId').value.trim());
 $('send').onclick=sendScore;
 $('retry').onclick=transmit;
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
  let deviceId=sessionStorage.getItem('MILFT_V2_DEVICE_ID');
  if(!deviceId||!valid.test(deviceId)){deviceId='android'+newId();sessionStorage.setItem('MILFT_V2_DEVICE_ID',deviceId);}
  state.deviceId=deviceId;
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
