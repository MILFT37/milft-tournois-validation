'use strict';
// MAJ72: deux appareils Android simulés, vrai SDK Firebase Auth+RTDB et émulateurs.
// Toutes les données sont synthétiques. Jamais de connexion à Firebase ni Drive réel.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('esbuild');
const {chromium}=require('playwright');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');

const projectId='demo-milft-v2-71';
const root=process.cwd();
const fixture=String.raw`
import {initializeApp} from 'firebase/app';
import {getAuth as rawGetAuth,connectAuthEmulator,signInAnonymously,onAuthStateChanged,signOut} from 'firebase/auth';
import {getDatabase as rawGetDatabase,connectDatabaseEmulator,ref,get as originalGet,set,remove,onValue,runTransaction as originalRunTransaction} from 'firebase/database';
export {initializeApp,onAuthStateChanged,signOut,ref,set,remove,onValue};
export async function runTransaction(...args){
 if(globalThis.__milftFailNextTransaction){
  globalThis.__milftFailNextTransaction=false;
  throw Error('simulated-network-temporary');
 }
 return originalRunTransaction(...args);
}
export async function get(reference){
 const hold=globalThis.__milftHoldOwnerFor;
 if(hold&&reference.toString().includes('/v2Trials/'+hold+'/ownerUid')){
   globalThis.__milftHoldOwnerFor=null;
   await new Promise(resolve=>{globalThis.__milftReleaseOwner=resolve;});
 }
 return originalGet(reference);
}
export function getAuth(app){
 const a=rawGetAuth(app);
 if(!a.__milftTestConnected){
  connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});
  a.__milftTestConnected=true;
 }
 return a;
}
export function getDatabase(app){
 const db=rawGetDatabase(app);
 if(!db.__milftTestConnected){
  connectDatabaseEmulator(db,'127.0.0.1',9000);
  db.__milftTestConnected=true;
 }
 return db;
}
export class GoogleAuthProvider {}
export async function signInWithPopup(auth){return signInAnonymously(auth);}
`;
const config="export const firebaseConfig="+JSON.stringify({
 apiKey:'test-public-key',authDomain:projectId+'.firebaseapp.com',
 databaseURL:'https://'+projectId+'-default-rtdb.firebaseio.com',
 projectId,appId:'1:123:web:milft-demo'
})+";\n";

async function main(){
 const bundle=await build({stdin:{contents:fixture,resolveDir:root,sourcefile:'sdk-fixture.mjs'},
    write:false,bundle:true,platform:'browser',format:'esm',target:'chrome110',logLevel:'silent'});
 const bundleCode=bundle.outputFiles[0].text;
 const appRoute="import {initializeApp} from './sdk-fixture.mjs';export {initializeApp};\n";
 const authRoute="export {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from './sdk-fixture.mjs';\n";
 const databaseRoute="export {getDatabase,ref,get,set,remove,onValue,runTransaction} from './sdk-fixture.mjs';\n";
 const replaceModule=src=>{
  const lookup=[
   ["import('https://www.gstatic.com/firebasejs/'+version+'/firebase-app.js')","import('/v2/app-fixture.mjs')"],
   ["import('https://www.gstatic.com/firebasejs/'+version+'/firebase-auth.js')","import('/v2/auth-fixture.mjs')"],
   ["import('https://www.gstatic.com/firebasejs/'+version+'/firebase-database.js')","import('/v2/database-fixture.mjs')"]
  ];
  for(const [a,b] of lookup){assert(src.includes(a),'Expected Firebase import anchor missing');src=src.replace(a,b);}
  return src;
 };
 const routes=new Map([
  ['/v2/sdk-fixture.mjs',bundleCode],
  ['/v2/app-fixture.mjs',appRoute],['/v2/auth-fixture.mjs',authRoute],
  ['/v2/database-fixture.mjs',databaseRoute],['/v2/firebase-config.mjs',config]
 ]);
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(!p.startsWith('/v2/')||p.includes('..')){res.writeHead(404).end();return;}
  if(routes.has(p)){
   res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(routes.get(p));return;
  }
  if(!['/v2/mobile-demo.mjs','/v2/mobile-demo.html','/v2/outbox-idb.js'].includes(p)){res.writeHead(404).end();return;}
  let data=fs.readFileSync(path.join(root,p),'utf8');
  if(p.endsWith('/mobile-demo.mjs'))data=replaceModule(data);
  res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':'text/javascript','Cache-Control':'no-store'}).end(data);
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser,environment;
 try{
  // Tester exactement les règles compactes publiées dans la console du club,
  // sans jamais écrire dans le vrai projet Firebase.
  const compact=JSON.parse(fs.readFileSync('v2/database.rules.console-v2-only.json','utf8'));
  const reference=JSON.parse(fs.readFileSync('v2/database.rules.json','utf8'));
  assert.equal(compact.rules['.read'],false);
  assert.equal(compact.rules['.write'],false);
  assert.equal(compact.rules.tournaments,undefined,'No real tournament path allowed');
  assert.deepEqual(compact.rules.v2Trials,reference.rules.v2Trials,'Compact rules must match tested V2 security subtree');
  environment=await initializeTestEnvironment({projectId,database:{host:'127.0.0.1',port:9000,rules:JSON.stringify(compact)}});
  await environment.clearDatabase();
  browser=await chromium.launch({headless:true});
  const androidA=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const androidB=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await Promise.all([androidA,androidB].map(ctx=>ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async txt=>{window.__milftCopied=txt;}}});
  })));
  const pageA=await androidA.newPage(),pageB=await androidB.newPage();
  const pageErrors=[];
  for(const p of [pageA,pageB])p.on('pageerror',e=>pageErrors.push(e.message));
  await Promise.all([pageA.goto(origin+'/v2/mobile-demo.html'),pageB.goto(origin+'/v2/mobile-demo.html')]);
  await Promise.all([pageA.locator('#signIn').waitFor({state:'visible'}),pageB.locator('#signIn').waitFor({state:'visible'})]);
  await Promise.all([pageA.locator('#signIn').click(),pageB.locator('#signIn').click()]);
  await Promise.all([pageA.locator('#rooms').waitFor({state:'visible',timeout:20000}),pageB.locator('#rooms').waitFor({state:'visible',timeout:20000})]);
  const uidA=await pageA.locator('#who').inputValue(),uidB=await pageB.locator('#who').inputValue();
  assert(uidA&&uidB&&uidA!==uidB,'Two phones must have separate authenticated identities');
  await pageB.locator('#copyUid').click();
  assert.equal(await pageB.evaluate(()=>window.__milftCopied),uidB,'Second Android copies Firebase UID in one tap');
  await pageA.locator('#create').click();
  await pageA.locator('#demo').waitFor({state:'visible',timeout:20000});
  const trial=await pageA.locator('#trialId').inputValue();
  assert.match(trial,/^trial[a-f0-9]{24}$/);
  await pageA.locator('#copyTrial').click();
  assert.equal(await pageA.evaluate(()=>window.__milftCopied),trial,'Owner copies trial code');
  assert.match(await pageA.locator('#roomNotice').innerText(),/Code de salle copié/,'Visible feedback next to copied code');
  await pageA.locator('#copyLink').click();
  const shareUrl=await pageA.evaluate(()=>window.__milftCopied);
  assert.equal(new URL(shareUrl).searchParams.get('essai'),trial,'Share link carries only trial code');
  assert.equal(new URL(shareUrl).pathname,'/v2/mobile-demo.html');
  assert.match(await pageA.locator('#roomNotice').innerText(),/Lien de partage copié/,'Visible feedback next to copied link');
  await pageB.goto(shareUrl);
  await pageB.locator('#rooms').waitFor({state:'visible',timeout:20000});
  assert.equal(await pageB.locator('#trialId').inputValue(),trial,'Second Android prefilled from share link');
  assert.equal(await pageA.locator('#role').innerText(),'Propriétaire');
  await pageB.locator('#trialId').fill(trial);
  await pageB.locator('#join').click();
  await pageB.locator('#status.error').waitFor();
  assert.equal(await pageB.locator('#demo').isHidden(),true,'Uninvited user cannot read a shared match');
  await pageA.locator('#invited').fill(uidB);
  await pageA.locator('#invite').click();
  await pageA.locator('#status.good').getByText('Utilisateur autorisé',{exact:false}).waitFor();
  assert.match(await pageA.locator('#inviteNotice').innerText(),/Utilisateur autorisé/,'Invite feedback visible next to owner controls');
  await pageB.locator('#join').click();
  await pageB.locator('#demo').waitFor({state:'visible',timeout:10000});
  assert.equal(await pageB.locator('#role').innerText(),'Autorisé à saisir');
  await pageA.locator('#home').fill('5');
  await pageA.locator('#away').fill('3');
  await pageA.locator('#send').click();
  await pageA.locator('#score').getByText('5 : 3').waitFor({timeout:15000});
  await pageB.locator('#score').getByText('5 : 3').waitFor({timeout:15000});
  await pageA.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  // MAJ78 : effacer un score ne doit pas le convertir en zéro.
  await pageA.locator('#home').fill('');
  await pageA.locator('#send').click();
  assert.match(await pageA.locator('#status.error').innerText(),/Buts invalides/);
  assert.equal(await pageA.locator('#score').innerText(),'5 : 3');
  assert.match(await pageA.locator('#queue').innerText(),/0 en attente/);
  await pageA.locator('#home').fill('5');
  // Start editing phone B. A updates to a newer version before B submits.
  await pageB.locator('#home').fill('6');
  await pageB.locator('#away').fill('4');
  await pageA.locator('#home').fill('7');
  await pageA.locator('#away').fill('5');
  await pageA.locator('#send').click();
  await pageB.locator('#score').getByText('7 : 5').waitFor({timeout:15000});
  assert.equal(await pageB.locator('#home').inputValue(),'6','Draft on phone B must not be overwritten by live update');
  await pageB.locator('#send').click();
  await pageB.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor({timeout:15000});
  const visibleGuestConflict=await pageB.locator('#conflicts').innerText();
  assert.match(visibleGuestConflict,/Score local A 6 : B 4/,'MAJ89: rejected guest score must be readable');
  assert.match(visibleGuestConflict,/version de départ 1/,'MAJ89: local base version must be readable');
  assert.match(visibleGuestConflict,/Brouillons locaux à vérifier/);
  await pageB.locator('#copyConflicts').click();
  const copiedGuest=await pageB.evaluate(()=>window.__milftCopied);
  assert.match(copiedGuest,/Score local A 6 : B 4/,'MAJ90: copy includes rejected score');
  assert.match(copiedGuest,/Score distant affiché : 7 : 5/,'MAJ90: copy includes visible remote score');
  assert.match(copiedGuest,/version de départ 1/);
  assert.match(await pageB.locator('#conflictNotice').innerText(),/copié/);
  assert.equal((await pageA.locator('#score').innerText()).trim(),'7 : 5','Conflicting edit cannot overwrite accepted score');
  const deviceBefore=await pageB.evaluate(()=>localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID'));
  await androidB.setOffline(true);
  await pageB.locator('#home').fill('8');
  await pageB.locator('#away').fill('6');
  await pageB.locator('#send').click();
  await pageB.locator('#status.error').getByText('Hors connexion',{exact:false}).waitFor();
  await pageB.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await pageB.close();
  await androidB.setOffline(false);
  const restored=await androidB.newPage();
  restored.on('pageerror',e=>pageErrors.push(e.message));
  await restored.goto(origin+'/v2/mobile-demo.html');
  await restored.locator('#rooms').waitFor({state:'visible',timeout:20000});
  assert.equal(await restored.evaluate(()=>localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')),deviceBefore,'Device identity must survive closing page');
  assert.equal(await restored.locator('#trialId').inputValue(),trial,'Last trial must survive closing page');
  await restored.locator('#join').click();
  await restored.locator('#demo').waitFor({state:'visible'});
  await restored.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor();
  await pageA.locator('#score').getByText('8 : 6').waitFor({timeout:20000});
  await restored.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  assert.equal(await pageA.locator('#score').innerText(),'8 : 6');
  // MAJ92 : deux appareils saisissent le MÊME résultat.
  // Le deuxième acquitte son brouillon sans augmenter la version distante.
  await pageA.locator('#create').click();
  await pageA.waitForFunction(previous=>document.getElementById('trialId').value!==previous,trial);
  await pageA.locator('#score').getByText('0 : 0').waitFor();
  const sameTrial=await pageA.locator('#trialId').inputValue();
  await pageA.locator('#invited').fill(uidB);
  await pageA.locator('#permission').selectOption('editor');
  await pageA.locator('#invite').click();
  await pageA.locator('#status.good').getByText('Utilisateur autorisé',{exact:false}).waitFor();
  await restored.locator('#trialId').fill(sameTrial);
  await restored.locator('#join').click();
  await restored.locator('#role').getByText('Autorisé à saisir').waitFor();
  await androidB.setOffline(true);
  await restored.locator('#home').fill('5');
  await restored.locator('#away').fill('3');
  await restored.locator('#send').click();
  await restored.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await pageA.locator('#home').fill('5');
  await pageA.locator('#away').fill('3');
  await pageA.locator('#send').click();
  await pageA.locator('#score').getByText('5 : 3').waitFor({timeout:15000});
  await androidB.setOffline(false);
  await restored.locator('#score').getByText('5 : 3').waitFor({timeout:15000});
  await restored.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor({timeout:20000});
  await restored.locator('#queue').getByText('0 conflit(s)',{exact:false}).waitFor();
  let acceptedSame;
  await environment.withSecurityRulesDisabled(async ctx=>{
    acceptedSame=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+sameTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(acceptedSame.version,1,'Same score must be acknowledged, not re-sent');
  assert.deepEqual(acceptedSame.sets['0'],{a:5,b:3});
  assert.equal(acceptedSame.updatedBy,uidA,'Owner confirmed score must not be rewritten by guest');
  // MAJ77 : changement de droits à chaud sans que l'invité actualise la page.
  await pageA.locator('#permission').selectOption('viewer');
  await pageA.locator('#invite').click();
  await restored.locator('#role').getByText('Lecture seule').waitFor({timeout:15000});
  assert.equal(await restored.locator('#send').isDisabled(),true,'Downgrade disables score entry in guest UI');
  assert.equal(await restored.locator('#retry').isDisabled(),true,'Downgrade disables queue retry');
  assert.equal(await restored.locator('#score').innerText(),'8 : 6','Viewer still sees authorized score');
  await pageA.locator('#permission').selectOption('editor');
  await pageA.locator('#invite').click();
  await restored.locator('#role').getByText('Autorisé à saisir').waitFor({timeout:15000});
  assert.equal(await restored.locator('#send').isEnabled(),true,'Editor permission restored dynamically');
  // Révocation en direct : plus d'accès à l'écran score sans rafraîchissement.
  await pageA.locator('#revoke').click();
  await pageA.locator('#status.good').getByText('Accès révoqué',{exact:false}).waitFor();
  assert.match(await pageA.locator('#inviteNotice').innerText(),/Accès révoqué/,'Revocation feedback visible next to controls');
  await restored.locator('#demo').waitFor({state:'hidden',timeout:15000});
  assert.match(await restored.locator('#status.error').innerText(),/Accès retiré/,'Guest sees immediate revocation');
  assert.equal(await restored.locator('#copyLink').isDisabled(),true,'Revoked guest has no sharing controls');
  assert.equal(await restored.locator('#copyConflicts').isDisabled(),true,'Revoked guest cannot export stale conflicts');
  assert.equal(await restored.locator('#conflicts').innerText(),'','Revocation clears old local drafts from screen');
  assert.equal(await restored.locator('#score').innerText(),'— : —','Revocation redacts old score in DOM');
  // MAJ78 : l'ouverture ancienne, retardée artificiellement, ne reprend pas la main.
  await pageA.evaluate(id=>{window.__milftHoldOwnerFor=id;},trial);
  await pageA.locator('#trialId').fill(trial);
  await pageA.locator('#join').click();
  await pageA.waitForFunction(()=>typeof window.__milftReleaseOwner==='function');
  await pageA.locator('#create').click();
  await pageA.locator('#demo').waitFor({state:'visible',timeout:15000});
  const nextTrial=await pageA.locator('#trialId').inputValue();
  assert.notEqual(nextTrial,trial);
  await pageA.locator('#score').getByText('0 : 0').waitFor();
  await pageA.evaluate(()=>{const release=window.__milftReleaseOwner;window.__milftReleaseOwner=null;release();});
  await pageA.waitForTimeout(250);
  assert.equal(await pageA.locator('#trialId').inputValue(),nextTrial,'Stale owner response cannot reopen previous room');
  assert.equal(await pageA.locator('#score').innerText(),'0 : 0');
  assert.equal(await pageA.locator('#role').innerText(),'Propriétaire');
  // MAJ79 : double-clic sur Enregistrer hors ligne : un seul événement local.
  await androidA.setOffline(true);
  await pageA.locator('#home').fill('4');
  await pageA.locator('#away').fill('2');
  await pageA.evaluate(()=>{const b=document.getElementById('send');b.click();b.click();});
  await pageA.locator('#status.error').getByText('Hors connexion',{exact:false}).waitFor();
  await pageA.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  assert.equal((await pageA.evaluate(async()=>{
    const d=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const values=await d.list(s);d.close();return values.length;
  })),1,'Double click creates a single queued event');
  await androidA.setOffline(false);
  await pageA.locator('#score').getByText('4 : 2').waitFor({timeout:20000});
  try {
    await pageA.locator('#queue').getByText('0 en attente',{exact:false}).waitFor({timeout:10000});
  } catch (error) {
    const diagnostic=await pageA.evaluate(async()=>{
      const d=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
      const s={tournamentId:document.getElementById('trialId').value,actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
      const items=(await d.list(s)).map(x=>({state:x.state,reason:x.reason,leaseUntil:x.leaseUntil,attempts:x.attempts}));
      d.close();
      return {items,queue:document.getElementById('queue').textContent,status:document.getElementById('status').textContent};
    });
    throw new Error('MAJ80 diagnostic de la file après reconnexion '+JSON.stringify(diagnostic),{cause:error});
  }
  assert.match(await pageA.locator('#version').innerText(),/Version distante 1/,'Only one confirmed event after reconnection');
  assert.notEqual(nextTrial,trial,'New room is different from previously completed match');
  // MAJ80 : relancer automatiquement un événement resté « sending » après
  // fermeture sans forcer le bail encore actif (plusieurs onglets possibles).
  await pageA.locator('#create').click();
  await pageA.waitForFunction(previous=>document.getElementById('trialId').value!==previous, nextTrial);
  await pageA.locator('#demo').waitFor({state:'visible'});
  await pageA.locator('#score').getByText('0 : 0').waitFor();
  const recoveryTrial=await pageA.locator('#trialId').inputValue();
  assert.notEqual(recoveryTrial,nextTrial,'A new trial must be opened before testing crash recovery');
  const stranded=await pageA.evaluate(async()=>{
    const d=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const scope={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const command={...scope,id:'eMAJ80Recovery',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:2,b:1}};
    await d.enqueue(scope,command);
    const lease=await d.claimNext(scope,{now:Date.now(),leaseMs:5000});
    const items=await d.list(scope);d.close();
    return {leaseId:lease?.command.id,items:items.map(x=>({id:x.command.id,state:x.state}))};
  });
  assert.equal(stranded.leaseId,'eMAJ80Recovery','Crash simulation must hold a sending lease');
  assert.deepEqual(stranded.items,[{id:'eMAJ80Recovery',state:'sending'}]);
  await pageA.close();
  const recovered=await androidA.newPage();
  recovered.on('pageerror',e=>pageErrors.push(e.message));
  await recovered.goto(origin+'/v2/mobile-demo.html');
  await recovered.locator('#rooms').waitFor({state:'visible',timeout:15000});
  await recovered.locator('#trialId').fill(recoveryTrial);
  await recovered.locator('#join').click();
  await recovered.locator('#demo').waitFor({state:'visible'});
  await recovered.locator('#queue').getByText('1 en cours',{exact:false}).waitFor({timeout:5000});
  assert.equal(await recovered.locator('#score').innerText(),'0 : 0',
    'Unexpired lease must not be sent early');
  assert.match(await recovered.locator('#queue').innerText(),/Reprise automatique/,
    'Recovery should be announced near the queue');
  await recovered.locator('#score').getByText('2 : 1').waitFor({timeout:12000});
  await recovered.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await recovered.locator('#queue').getByText('0 en cours',{exact:false}).waitFor();
  assert.match(await recovered.locator('#queue').innerText(),/0 en attente/);
  // MAJ81 : deux scores hors ligne, dont le premier était réservé au crash.
  // L'ordre chronologique prime sur les IDs, et le second ne doit pas
  // s'envoyer avant l'expiration du bail du premier.
  await recovered.locator('#create').click();
  await recovered.waitForFunction(previous=>document.getElementById('trialId').value!==previous,recoveryTrial);
  await recovered.locator('#score').getByText('0 : 0').waitFor();
  const fifoTrial=await recovered.locator('#trialId').inputValue();
  const queuePair=await recovered.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const make=(id,v,goals)=>({...s,id,matchId:'demo',type:'set.record',
      expectedVersion:v,setIndex:0,goals});
    const now=Date.now();
    await db.enqueue(s,make('eZMAJ81First',0,{a:1,b:0}),now);
    await db.enqueue(s,make('eAMAJ81Second',1,{a:3,b:2}),now+1);
    const first=await db.claimNext(s,{now,leaseMs:5000});
    const items=(await db.list(s)).map(x=>({id:x.command.id,state:x.state}));
    db.close();return {first:first?.command.id,items};
  });
  assert.equal(queuePair.first,'eZMAJ81First');
  assert.deepEqual(queuePair.items.map(x=>x.state),['sending','pending']);
  await recovered.reload();
  await recovered.locator('#rooms').waitFor({state:'visible',timeout:15000});
  await recovered.locator('#join').click();
  await recovered.locator('#demo').waitFor({state:'visible'});
  await recovered.locator('#queue').getByText('1 en attente, 1 en cours',{exact:false}).waitFor();
  assert.equal(await recovered.locator('#score').innerText(),'0 : 0',
    'The second queued score cannot bypass an unexpired first lease');
  await recovered.locator('#score').getByText('3 : 2').waitFor({timeout:15000});
  await recovered.locator('#version').getByText('Version distante 2',{exact:false}).waitFor();
  await recovered.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  // MAJ82 : deux saisies réelles dans l'UI pendant la même déconnexion.
  // Le second score se base sur la première opération locale, pas sur
  // la version distante restée figée pendant le mode hors connexion.
  await recovered.locator('#create').click();
  await recovered.waitForFunction(previous=>document.getElementById('trialId').value!==previous,fifoTrial);
  await recovered.locator('#score').getByText('0 : 0').waitFor();
  const chainedTrial=await recovered.locator('#trialId').inputValue();
  await androidA.setOffline(true);
  await recovered.locator('#home').fill('2');
  await recovered.locator('#away').fill('1');
  await recovered.locator('#send').click();
  await recovered.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await recovered.locator('#home').fill('4');
  await recovered.locator('#away').fill('2');
  await recovered.locator('#send').click();
  await recovered.locator('#queue').getByText('2 en attente',{exact:false}).waitFor();
  const queuedVersions=await recovered.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const values=(await db.list(s)).map(x=>({v:x.command.expectedVersion,id:x.command.id,dependsOn:x.dependsOn}));
    db.close();return values;
  });
  assert.deepEqual(queuedVersions.map(x=>x.v),[0,1],'Two offline UI edits must not share the same version');
  assert.equal(queuedVersions[1].dependsOn,queuedVersions[0].id,'Second score depends on first receipt');
  assert.equal(await recovered.locator('#score').innerText(),'0 : 0','No offline score transmitted before reconnection');
  await androidA.setOffline(false);
  await recovered.locator('#score').getByText('4 : 2').waitFor({timeout:20000});
  await recovered.locator('#version').getByText('Version distante 2',{exact:false}).waitFor();
  await recovered.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let chainedMatch;
  await environment.withSecurityRulesDisabled(async ctx=>{
    chainedMatch=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+chainedTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(chainedMatch.version,2,'Both offline edits must be applied once and in order');
  assert.deepEqual(chainedMatch.sets['0'],{a:4,b:2});
  // MAJ83 : le deuxième score hors ligne dépend du premier.
  // Une écriture concurrente sur Firebase rend le premier invalide.
  // La file doit conserver les deux conflits, puis autoriser un nouveau score.
  await recovered.locator('#create').click();
  await recovered.waitForFunction(previous=>document.getElementById('trialId').value!==previous,chainedTrial);
  await recovered.locator('#score').getByText('0 : 0').waitFor();
  const failedTrial=await recovered.locator('#trialId').inputValue();
  await androidA.setOffline(true);
  await recovered.locator('#home').fill('2');
  await recovered.locator('#away').fill('1');
  await recovered.locator('#send').click();
  await recovered.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await recovered.locator('#home').fill('4');
  await recovered.locator('#away').fill('2');
  await recovered.locator('#send').click();
  await recovered.locator('#queue').getByText('2 en attente',{exact:false}).waitFor();
  await environment.withSecurityRulesDisabled(async ctx=>{
    await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+failedTrial+'/matches/demo').update({
        version:1,sets:{'0':{a:6,b:5}},lastEventId:'remote83',
        lastEventFingerprint:'remote83',updatedBy:'other-device-83'
      });
  });
  await androidA.setOffline(false);
  await recovered.locator('#score').getByText('6 : 5').waitFor({timeout:15000});
  await recovered.locator('#queue').getByText('2 conflit(s)',{exact:false}).waitFor({timeout:20000});
  const shownConflicts=await recovered.locator('#conflicts').innerText();
  assert.match(shownConflicts,/Score précédent/,
    'Dependent draft must show preserved conflict and never silently disappear');
  assert.match(shownConflicts,/Score local A 2 : B 1/,'MAJ89: first local score visible');
  assert.match(shownConflicts,/Score local A 4 : B 2/,'MAJ89: dependent local score visible');
  assert.match(shownConflicts,/version de départ 0/,'MAJ89: first expected version visible');
  assert.match(shownConflicts,/version de départ 1/,'MAJ89: second expected version visible');
  assert.equal((shownConflicts.match(/conservé sur cet appareil/g)||[]).length,2,
    'MAJ89: two distinct preserved drafts visible');
  assert.match(await recovered.locator('#version').innerText(),/Version distante 1/);
  await recovered.locator('#home').fill('7');
  await recovered.locator('#away').fill('6');
  await recovered.locator('#send').click();
  await recovered.locator('#score').getByText('7 : 6').waitFor({timeout:20000});
  await recovered.locator('#version').getByText('Version distante 2',{exact:false}).waitFor();
  await recovered.locator('#queue').getByText('0 en attente, 0 en cours, 2 conflit(s)',{exact:false}).waitFor();
  let resolvedMatch;
  await environment.withSecurityRulesDisabled(async ctx=>{
    resolvedMatch=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+failedTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(resolvedMatch.version,2,'Remote change and new independent score only');
  assert.deepEqual(resolvedMatch.sets['0'],{a:7,b:6});
  const strandedEntries=await recovered.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const entries=(await db.list(s)).map(x=>({state:x.state,reason:x.reason}));
    db.close();return entries;
  });
  assert.deepEqual(strandedEntries.map(x=>x.state),['conflict','conflict'],
    'Both original offline scores must remain for review');
  // MAJ89 : rechargement du navigateur, les deux scores et motifs
  // restent visibles sans demander de renvoi ni modifier Firebase.
  await recovered.reload();
  await recovered.locator('#rooms').waitFor({state:'visible',timeout:15000});
  await recovered.locator('#trialId').fill(failedTrial);
  await recovered.locator('#join').click();
  await recovered.locator('#demo').waitFor({state:'visible'});
  await recovered.locator('#queue').getByText('2 conflit(s)',{exact:false}).waitFor();
  const restoredConflicts=await recovered.locator('#conflicts').innerText();
  assert.match(restoredConflicts,/Score local A 2 : B 1/);
  assert.match(restoredConflicts,/Score local A 4 : B 2/);
  assert.equal(await recovered.locator('#score').innerText(),'7 : 6',
    'MAJ89: reading local drafts must never overwrite accepted remote score');
  await recovered.locator('#copyConflicts').click();
  const copiedBoth=await recovered.evaluate(()=>window.__milftCopied);
  assert.match(copiedBoth,/Score local A 2 : B 1/);
  assert.match(copiedBoth,/Score local A 4 : B 2/);
  assert.match(copiedBoth,/Score distant affiché : 7 : 6/);
  assert.doesNotMatch(copiedBoth,/apiKey|MILFT_V2_DEMO_DEVICE_ID|UID du second compte/);
  await recovered.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
  await recovered.locator('#copyConflicts').click();
  assert.equal(await recovered.locator('#conflictFallback').isVisible(),true);
  assert.match(await recovered.locator('#conflictFallback').inputValue(),/Score local A 4 : B 2/);
  assert.match(await recovered.locator('#conflictNotice').innerText(),/utiliser Copier/);
  // MAJ84 : erreur réseau temporaire alors que le navigateur reste en ligne.
  // La file reprogramme une tentative sans clic et avec le même identifiant,
  // même après fermeture puis réouverture du navigateur avant l'échéance.
  await recovered.locator('#create').click();
  await recovered.waitForFunction(previous=>document.getElementById('trialId').value!==previous,failedTrial);
  await recovered.locator('#score').getByText('0 : 0').waitFor();
  assert.equal(await recovered.locator('#copyConflicts').isDisabled(),true);
  assert.equal(await recovered.locator('#conflictFallback').isHidden(),true);
  assert.equal(await recovered.locator('#conflictFallback').inputValue(),'');
  const retryTrial=await recovered.locator('#trialId').inputValue();
  await recovered.evaluate(()=>{window.__milftFailNextTransaction=true;});
  await recovered.locator('#home').fill('9');
  await recovered.locator('#away').fill('7');
  await recovered.locator('#send').click();
  await recovered.locator('#status.error').getByText('nouvelle tentative automatique',{exact:false}).waitFor({timeout:15000});
  await recovered.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  const waitingRetry=await recovered.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const items=await db.list(s);db.close();
    return items.map(x=>({id:x.command.id,state:x.state,retryAt:x.retryAt,attempts:x.attempts}));
  });
  assert.equal(waitingRetry.length,1);
  assert.equal(waitingRetry[0].state,'pending');
  assert(waitingRetry[0].retryAt>Date.now()-2000,'Retry deadline saved to IndexedDB');
  await recovered.close();
  const retryPage=await androidA.newPage();
  retryPage.on('pageerror',err=>pageErrors.push(err.message));
  await retryPage.goto(origin+'/v2/mobile-demo.html');
  await retryPage.locator('#rooms').waitFor({state:'visible',timeout:15000});
  await retryPage.locator('#trialId').fill(retryTrial);
  await retryPage.locator('#join').click();
  await retryPage.locator('#demo').waitFor({state:'visible'});
  await retryPage.locator('#score').getByText('9 : 7').waitFor({timeout:15000});
  await retryPage.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await retryPage.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let remoteRetry;
  await environment.withSecurityRulesDisabled(async ctx=>{
    remoteRetry=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+retryTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(remoteRetry.version,1,'Temporary network error must be retried exactly once');
  assert.equal(remoteRetry.lastEventId,waitingRetry[0].id,'Retry reuses the original operation ID');
  assert.deepEqual(remoteRetry.sets['0'],{a:9,b:7});
  // MAJ91 : huit erreurs temporaires sur le même score doivent
  // suspendre la reprise automatique, sans effacer l'événement.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,retryTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  const pausedTrial=await retryPage.locator('#trialId').inputValue();
  const preparedPause=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const cmd={...s,id:'eMAJ91Pause',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:5,b:3}};
    const queued=await db.enqueue(s,cmd);
    for(let i=0;i<7;i++){
      const head=await db.claimNext(s,{ignoreRetryAt:true});
      await db.finish(s,head.command.id,head.leaseToken,'temporary-error',
        {retryAfterMs:0,reason:'simulated-network-repeat'});
    }
    const entries=await db.list(s);db.close();
    return {queued:queued.status,attempts:entries[0].attempts,retryPaused:entries[0].retryPaused};
  });
  assert.equal(preparedPause.queued,'queued');
  assert.equal(preparedPause.attempts,7);
  assert.notEqual(preparedPause.retryPaused,true);
  await retryPage.evaluate(()=>{window.__milftFailNextTransaction=true;});
  await retryPage.locator('#retry').click();
  await retryPage.locator('#status.error').getByText('8 tentatives',{exact:false}).waitFor({timeout:15000});
  await retryPage.locator('#queue').getByText('envoi(s) en pause',{exact:false}).waitFor({timeout:15000});
  const persistedPause=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const records=await db.list(s);db.close();
    return records.map(x=>({id:x.command.id,state:x.state,attempts:x.attempts,
      retryPaused:x.retryPaused,retryAt:x.retryAt}));
  });
  assert.deepEqual(persistedPause,[{id:'eMAJ91Pause',state:'pending',attempts:8,
    retryPaused:true,retryAt:0}]);
  await retryPage.reload();
  await retryPage.locator('#rooms').waitFor({state:'visible',timeout:15000});
  await retryPage.locator('#trialId').fill(pausedTrial);
  await retryPage.locator('#join').click();
  await retryPage.locator('#demo').waitFor({state:'visible'});
  await retryPage.locator('#queue').getByText('envoi(s) en pause',{exact:false}).waitFor();
  await retryPage.waitForTimeout(900);
  assert.equal(await retryPage.locator('#score').innerText(),'0 : 0',
    'Paused command must not retry automatically after reload');
  await retryPage.locator('#retry').click();
  await retryPage.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await retryPage.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await retryPage.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let resumedRemote;
  await environment.withSecurityRulesDisabled(async ctx=>{
    resumedRemote=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+pausedTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(resumedRemote.version,1,'Only one confirmed write after eight failures');
  assert.equal(resumedRemote.lastEventId,'eMAJ91Pause','Manual retry preserves event ID');
  assert.deepEqual(resumedRemote.sets['0'],{a:5,b:3});
  // MAJ85 : le statut d'un match fictif ne peut pas être confondu
  // avec une panne réseau transitoire. Injecter des états « terminé »
  // et « match supprimé » uniquement dans la base émulateur.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,retryTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  const finishedTrial=await retryPage.locator('#trialId').inputValue();
  await environment.withSecurityRulesDisabled(async ctx=>{
    await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+finishedTrial+'/matches/demo/status').set('finished');
  });
  await retryPage.waitForFunction(()=>document.getElementById('send').disabled===true);
  assert.equal(await retryPage.locator('#send').isDisabled(),true,'Finished match must disable score entry');
  const localFinished=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const res=await db.enqueue(s,{...s,id:'eMAJ85Finished',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:5,b:3}});
    db.close();return res;
  });
  assert.equal(localFinished.status,'queued');
  await retryPage.locator('#retry').click();
  await retryPage.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor({timeout:15000});
  assert.match(await retryPage.locator('#status.error').innerText(),/Match fictif terminé/);
  const finishedState=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const items=await db.list(s);db.close();
    return items.map(x=>({state:x.state,reason:x.reason,retryAt:x.retryAt||0,attempts:x.attempts}));
  });
  assert.deepEqual(finishedState,[{state:'conflict',reason:'closed-match',retryAt:0,attempts:1}],
    'Finished score must be retained as terminal conflict without retry timer');
  let remoteFinished;
  await environment.withSecurityRulesDisabled(async ctx=>{
    remoteFinished=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+finishedTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(remoteFinished.version,0,'No write allowed on finished match');
  assert.equal(remoteFinished.status,'finished');

  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,finishedTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  const missingTrial=await retryPage.locator('#trialId').inputValue();
  await environment.withSecurityRulesDisabled(async ctx=>{
    await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+missingTrial+'/matches/demo').remove();
  });
  await retryPage.locator('#score').getByText('— : —').waitFor({timeout:15000});
  assert.equal(await retryPage.locator('#send').isDisabled(),true,'Missing match must disable score entry');
  const localMissing=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const res=await db.enqueue(s,{...s,id:'eMAJ85Missing',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:4,b:2}});
    db.close();return res;
  });
  assert.equal(localMissing.status,'queued');
  await retryPage.locator('#retry').click();
  await retryPage.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor({timeout:15000});
  assert.match(await retryPage.locator('#status.error').innerText(),/Match fictif introuvable/);
  const missingState=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const entries=await db.list(s);db.close();
    return entries.map(x=>({state:x.state,reason:x.reason,retryAt:x.retryAt||0,attempts:x.attempts}));
  });
  assert.deepEqual(missingState,[{state:'conflict',reason:'missing-match',retryAt:0,attempts:1}],
    'Missing score must be retained as conflict, not retried forever');
  let remoteMissing;
  await environment.withSecurityRulesDisabled(async ctx=>{
    remoteMissing=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+missingTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(remoteMissing,null,'No remote match may be silently recreated');
  // MAJ86 : une file de plus de 15 opérations ne doit plus se figer
  // après le premier lot, même sans interaction supplémentaire.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,missingTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  const bulkTrial=await retryPage.locator('#trialId').inputValue();
  await androidA.setOffline(true);
  const bulkQueued=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const initial=Date.now();
    for(let i=0;i<18;i++){
      const cmd={...s,id:'eMAJ86_'+String(i+1).padStart(2,'0'),matchId:'demo',
        type:'set.record',expectedVersion:0,setIndex:0,goals:{a:i+1,b:i}};
      const result=await db.enqueue(s,cmd,initial+i,{chainLocalScore:true});
      if(result.status!=='queued')throw Error('MAJ86 enqueue '+i+': '+result.status);
    }
    const entries=await db.list(s);db.close();
    return entries.map(x=>({id:x.command.id,version:x.command.expectedVersion,state:x.state}));
  });
  assert.equal(bulkQueued.length,18,'At least 18 offline edits needed to test batch continuation');
  assert.deepEqual(bulkQueued.map(x=>x.version),Array.from({length:18},(_,i)=>i));
  assert.deepEqual(bulkQueued.map(x=>x.state),Array(18).fill('pending'));
  await androidA.setOffline(false);
  await retryPage.locator('#score').getByText('18 : 17').waitFor({timeout:75000});
  await retryPage.locator('#version').getByText('Version distante 18',{exact:false}).waitFor({timeout:15000});
  await retryPage.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor({timeout:15000});
  let bulkRemote;
  await environment.withSecurityRulesDisabled(async ctx=>{
    bulkRemote=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+bulkTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(bulkRemote.version,18,'All 18 operations sent despite 15-item batch boundary');
  assert.equal(bulkRemote.lastEventId,'eMAJ86_18','Last operation must be applied in FIFO order');
  assert.deepEqual(bulkRemote.sets['0'],{a:18,b:17});
  const bulkRemaining=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const entries=await db.list(s);db.close();return entries.length;
  });
  assert.equal(bulkRemaining,0,'18 confirmations must clear the persistent local queue');
  // MAJ87 : après un retour au premier plan, une commande persistante
  // sans nouvel événement réseau doit repartir d'elle-même.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,bulkTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  await retryPage.bringToFront();
  await retryPage.locator('#retry').waitFor({state:'visible'});
  await retryPage.waitForFunction(()=>!document.getElementById('retry').disabled);
  const foregroundTrial=await retryPage.locator('#trialId').inputValue();
  const foregroundSaved=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const result=await db.enqueue(s,{...s,id:'eMAJ87Foreground',matchId:'demo',
      type:'set.record',expectedVersion:0,setIndex:0,goals:{a:5,b:3}});
    const entries=await db.list(s);db.close();
    return {result,entries:entries.map(x=>x.state)};
  });
  assert.equal(foregroundSaved.result.status,'queued');
  assert.deepEqual(foregroundSaved.entries,['pending']);
  assert.equal(await retryPage.locator('#score').innerText(),'0 : 0',
    'Queued foreground score must not send before the lifecycle event');
  await retryPage.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await retryPage.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await retryPage.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await retryPage.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let foregroundRemote;
  await environment.withSecurityRulesDisabled(async ctx=>{
    foregroundRemote=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+foregroundTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(foregroundRemote.version,1);
  assert.equal(foregroundRemote.lastEventId,'eMAJ87Foreground');
  assert.deepEqual(foregroundRemote.sets['0'],{a:5,b:3});

  // Les événements de visibilité ne doivent PAS contourner la temporisation
  // persistante de MAJ84. Une seule transmission après échéance.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,foregroundTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  await retryPage.waitForFunction(()=>!document.getElementById('retry').disabled);
  const delayedTrial=await retryPage.locator('#trialId').inputValue();
  const delayedSaved=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const cmd={...s,id:'eMAJ87Backoff',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:6,b:4}};
    const queued=await db.enqueue(s,cmd);
    const lease=await db.claimNext(s,{leaseMs:1000});
    const failure=await db.finish(s,lease.command.id,lease.leaseToken,'temporary-error',
      {retryAfterMs:3000,reason:'simulated-temporary'});
    const entries=await db.list(s);db.close();
    return {queued:queued.status,failure:failure.status,
      retryAt:entries[0].retryAt,attempts:entries[0].attempts};
  });
  assert.equal(delayedSaved.queued,'queued');
  assert.equal(delayedSaved.failure,'pending');
  assert.equal(delayedSaved.attempts,1);
  await retryPage.evaluate(()=>{
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await retryPage.waitForTimeout(450);
  assert.equal(await retryPage.locator('#score').innerText(),'0 : 0',
    'Foreground events must not bypass persisted retryAt');
  const stillQueued=await retryPage.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const s={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const entries=await db.list(s);db.close();
    return entries.map(x=>({state:x.state,attempts:x.attempts}));
  });
  assert.deepEqual(stillQueued,[{state:'pending',attempts:1}]);
  await retryPage.locator('#score').getByText('6 : 4').waitFor({timeout:12000});
  await retryPage.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await retryPage.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let delayedRemote;
  await environment.withSecurityRulesDisabled(async ctx=>{
    delayedRemote=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+delayedTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(delayedRemote.version,1,'Only one accepted retry after visibility change');
  assert.equal(delayedRemote.lastEventId,'eMAJ87Backoff','Original ID must be retained');
  assert.deepEqual(delayedRemote.sets['0'],{a:6,b:4});
  // MAJ88 : les opérations locales conservées pendant lecture seule
  // doivent reprendre automatiquement si le propriétaire restaure editor.
  // Vérifier aussi qu'aucun envoi ne passe tant que le compte est viewer.
  await retryPage.locator('#create').click();
  await retryPage.waitForFunction(previous=>document.getElementById('trialId').value!==previous,delayedTrial);
  await retryPage.locator('#score').getByText('0 : 0').waitFor();
  const rightsTrial=await retryPage.locator('#trialId').inputValue();
  await retryPage.locator('#invited').fill(uidB);
  await retryPage.locator('#permission').selectOption('editor');
  await retryPage.locator('#invite').click();
  await retryPage.locator('#status.good').getByText('Utilisateur autorisé',{exact:false}).waitFor();

  await restored.locator('#trialId').fill(rightsTrial);
  await restored.locator('#join').click();
  await restored.locator('#role').getByText('Autorisé à saisir').waitFor();
  const savedRoleDraft=await restored.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const scope={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const command={...scope,id:'eMAJ88RoleRestored',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:7,b:5}};
    const saved=await db.enqueue(scope,command,Date.now(),{chainLocalScore:true});
    const items=await db.list(scope);db.close();
    return {status:saved.status,items:items.map(x=>({id:x.command.id,state:x.state}))};
  });
  assert.equal(savedRoleDraft.status,'queued','Local score must be persisted before permission change');
  assert.deepEqual(savedRoleDraft.items,[{id:'eMAJ88RoleRestored',state:'pending'}]);

  await retryPage.locator('#permission').selectOption('viewer');
  await retryPage.locator('#invite').click();
  await restored.locator('#role').getByText('Lecture seule').waitFor({timeout:15000});
  await restored.locator('#join').click();
  await restored.locator('#role').getByText('Lecture seule').waitFor();
  await restored.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  assert.equal(await restored.locator('#send').isDisabled(),true);
  assert.equal(await restored.locator('#retry').isDisabled(),true);
  assert.equal(await restored.locator('#score').innerText(),'0 : 0');
  const whileViewer=await restored.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_DEMO_OUTBOX_20261120'});
    const scope={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')};
    const rows=await db.list(scope);db.close();return rows.map(x=>({state:x.state,attempts:x.attempts}));
  });
  assert.deepEqual(whileViewer,[{state:'pending',attempts:0}],
    'Downgraded viewer cannot transmit or consume a pending local score');
  await restored.bringToFront();
  await retryPage.locator('#permission').selectOption('editor');
  await retryPage.locator('#invite').click();
  await restored.locator('#role').getByText('Autorisé à saisir').waitFor({timeout:15000});
  await restored.locator('#score').getByText('7 : 5').waitFor({timeout:20000});
  await restored.locator('#version').getByText('Version distante 1',{exact:false}).waitFor();
  await restored.locator('#queue').getByText('0 en attente, 0 en cours',{exact:false}).waitFor();
  let rightsRemote;
  await environment.withSecurityRulesDisabled(async ctx=>{
    rightsRemote=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+rightsTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(rightsRemote.version,1,'Restored editor sends only one score');
  assert.equal(rightsRemote.lastEventId,'eMAJ88RoleRestored','Same pending event ID reused');
  assert.deepEqual(rightsRemote.sets['0'],{a:7,b:5});
  let actual;
  await environment.withSecurityRulesDisabled(async ctx=>{
    actual=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com').ref('v2Trials/'+trial+'/matches/demo').once('value')).val();
  });
  assert.equal(actual.version,3,'Three accepted score updates only');
  assert.deepEqual(actual.sets['0'],{a:8,b:6});
  let fifoMatch;
  await environment.withSecurityRulesDisabled(async ctx=>{
    fifoMatch=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com')
      .ref('v2Trials/'+fifoTrial+'/matches/demo').once('value')).val();
  });
  assert.equal(fifoMatch.version,2,'Exactly two ordered accepted score updates');
  assert.equal(fifoMatch.lastEventId,'eAMAJ81Second','The first event must be confirmed before the second');
  assert.deepEqual(fifoMatch.sets['0'],{a:3,b:2});
  assert.deepEqual(pageErrors,[],'Browser UI must not throw JavaScript errors');
  await Promise.all([androidA.close(),androidB.close()]);
  console.log('OK MAJ81 Android↔Android Firebase émulé : droits, offline, reprise et transmission FIFO avec bail actif');
 }finally{
  if(browser)await browser.close();
  if(environment)await environment.cleanup();
  await new Promise(ok=>server.close(ok));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
