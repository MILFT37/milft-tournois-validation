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
import {getDatabase as rawGetDatabase,connectDatabaseEmulator,ref,get,set,remove,onValue,runTransaction} from 'firebase/database';
export {initializeApp,onAuthStateChanged,signOut,ref,get,set,remove,onValue,runTransaction};
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
  // MAJ77 : changement de droits à chaud sans que l'invité actualise la page.
  await pageA.locator('#permission').selectOption('viewer');
  await pageA.locator('#invite').click();
  await pageB.locator('#role').getByText('Lecture seule').waitFor({timeout:15000});
  assert.equal(await pageB.locator('#send').isDisabled(),true,'Downgrade disables score entry in guest UI');
  assert.equal(await pageB.locator('#retry').isDisabled(),true,'Downgrade disables queue retry');
  assert.equal(await pageB.locator('#score').innerText(),'8 : 6','Viewer still sees authorized score');
  await pageA.locator('#permission').selectOption('editor');
  await pageA.locator('#invite').click();
  await pageB.locator('#role').getByText('Autorisé à saisir').waitFor({timeout:15000});
  assert.equal(await pageB.locator('#send').isEnabled(),true,'Editor permission restored dynamically');
  // Révocation en direct : plus d'accès à l'écran score sans rafraîchissement.
  await pageA.locator('#revoke').click();
  await pageA.locator('#status.good').getByText('Accès révoqué',{exact:false}).waitFor();
  assert.match(await pageA.locator('#inviteNotice').innerText(),/Accès révoqué/,'Revocation feedback visible next to controls');
  await pageB.locator('#demo').waitFor({state:'hidden',timeout:15000});
  assert.match(await pageB.locator('#status.error').innerText(),/Accès retiré/,'Guest sees immediate revocation');
  assert.equal(await pageB.locator('#copyLink').isDisabled(),true,'Revoked guest has no sharing controls');
  assert.equal(await pageB.locator('#score').innerText(),'— : —','Revocation redacts old score in DOM');
  let actual;
  await environment.withSecurityRulesDisabled(async ctx=>{
    actual=(await ctx.database('https://'+projectId+'-default-rtdb.firebaseio.com').ref('v2Trials/'+trial+'/matches/demo').once('value')).val();
  });
  assert.equal(actual.version,3,'Three accepted score updates only');
  assert.deepEqual(actual.sets['0'],{a:8,b:6});
  assert.deepEqual(pageErrors,[],'Browser UI must not throw JavaScript errors');
  await Promise.all([androidA.close(),androidB.close()]);
  console.log('OK MAJ72 Android↔Android navigateur + Firebase Auth/RTDB émulés : création, invitation, édition live, conflit conservé, hors ligne et reprise après fermeture, révocation');
 }finally{
  if(browser)await browser.close();
  if(environment)await environment.cleanup();
  await new Promise(ok=>server.close(ok));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
