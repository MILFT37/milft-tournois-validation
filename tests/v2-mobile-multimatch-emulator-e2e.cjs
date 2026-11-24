'use strict';
// MAJ94: browser UI tests use Auth/RTDB Emulator only. No production service.
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {build}=require('esbuild');
const {chromium}=require('playwright');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const projectId='demo-milft-v2-94';
const databaseURL='https://'+projectId+'-default-rtdb.firebaseio.com';
const fixture=[
 "import {initializeApp} from 'firebase/app';",
 "import {getAuth as realAuth,connectAuthEmulator,signInAnonymously,onAuthStateChanged,signOut} from 'firebase/auth';",
 "import {getDatabase as realDb,connectDatabaseEmulator,ref,get,set,remove,onValue,runTransaction} from 'firebase/database';",
 "export {initializeApp,signInAnonymously,onAuthStateChanged,signOut,ref,get,set,remove,onValue,runTransaction};",
 "export class GoogleAuthProvider {}",
 "export function getAuth(app){const a=realAuth(app);if(!a.__milftEmulated){connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});a.__milftEmulated=true;}return a;}",
 "export function getDatabase(app){const db=realDb(app);if(!db.__milftEmulated){connectDatabaseEmulator(db,'127.0.0.1',9000);db.__milftEmulated=true;}return db;}",
 "export function signInWithPopup(auth){return signInAnonymously(auth);}"
].join('\n');
const cfg='export const firebaseConfig='+JSON.stringify({
 apiKey:'emulator-test-only',authDomain:projectId+'.firebaseapp.com',
 databaseURL,projectId,appId:'1:123:web:milft-emulator-only'
})+';\n';
const rules=fs.readFileSync('v2/database.rules.multimatch-candidate.emulator.json','utf8');
const config=JSON.parse(fs.readFileSync('firebase.v2.multimatch.emulator.json','utf8'));
assert.equal(config.database.rules,'v2/database.rules.multimatch-candidate.emulator.json');
const app=fs.readFileSync('v2/mobile-multimatch-emulator.mjs','utf8');
assert(!app.includes('milft-tournois-partage-55e44')&&!app.includes('https://www.gstatic.com/'));
assert(app.includes('./multimatch-emulator-sdk-test-only.mjs'));
assert(app.includes('./multimatch-emulator-config-test-only.mjs'));
async function main(){
 const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),
   sourcefile:'multimatch-fixture.mjs'},bundle:true,write:false,
   platform:'browser',format:'esm',target:'chrome110',logLevel:'silent'});
 const routes=new Map([
  ['/v2/multimatch-emulator-sdk-test-only.mjs',bundle.outputFiles[0].text],
  ['/v2/multimatch-emulator-config-test-only.mjs',cfg]
 ]);
 const allow=new Set(['/v2/mobile-multimatch-emulator.html',
  '/v2/mobile-multimatch-emulator.mjs','/v2/score-formats-emulator.mjs','/v2/draft-multimatch-emulator.mjs','/v2/outbox-multimatch-emulator.js']);
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname;
  if(routes.has(name)){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(routes.get(name));return;}
  if(!allow.has(name)){res.writeHead(404).end('Fixture only');return;}
  const bytes=fs.readFileSync(path.join(process.cwd(),name.slice(1)));
  res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html':'text/javascript','Cache-Control':'no-store'}).end(bytes);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const env=await initializeTestEnvironment({projectId,
  database:{host:'127.0.0.1',port:9000,rules}});
 const browser=await chromium.launch({headless:true});
 const phone=await browser.newContext({viewport:{width:412,height:915},
  isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const pc=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:'block'});
 const errors=[];
 try{
  await env.clearDatabase();
  for(const context of [phone,pc]){
   await context.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin+'/')||url.startsWith('http://127.0.0.1:9099/')||url.startsWith('http://127.0.0.1:9000/'))
      return route.continue();
    return route.abort();
   });
  }
  const samsung=await phone.newPage(),desktop=await pc.newPage();
  for(const page of [samsung,desktop])page.on('pageerror',e=>errors.push(e.message));
  const url=origin+'/v2/mobile-multimatch-emulator.html';
  await Promise.all([samsung.goto(url),desktop.goto(url)]);
  await Promise.all([samsung.locator('#signIn').waitFor({state:'visible'}),
    desktop.locator('#signIn').waitFor({state:'visible'})]);
  await Promise.all([samsung.locator('#signIn').click(),desktop.locator('#signIn').click()]);
  await Promise.all([samsung.locator('#rooms').waitFor({state:'visible',timeout:20000}),
    desktop.locator('#rooms').waitFor({state:'visible',timeout:20000})]);
  const uidMobile=await samsung.locator('#who').inputValue(),uidPc=await desktop.locator('#who').inputValue();
  assert(uidMobile&&uidPc&&uidMobile!==uidPc,'Two simulated identities required');
  await samsung.locator('#create').click();
  await samsung.locator('#demo').waitFor({state:'visible',timeout:20000});
  const room=await samsung.locator('#trialId').inputValue();
  assert.match(room,/^trial[a-f0-9]{24}$/);
  await samsung.locator('#newMatch').fill('courtB');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await samsung.locator('#matchSelect').locator('option[value="courtB"]').waitFor({state:'attached'});
  await samsung.locator('#matchSelect').selectOption('demo');
  await samsung.locator('#invited').fill(uidPc);
  await samsung.locator('#permission').selectOption('editor');
  await samsung.locator('#invite').click();
  await samsung.locator('#status.good').getByText('Utilisateur autorisé',{exact:false}).waitFor();
  await desktop.locator('#trialId').fill(room);
  await desktop.locator('#join').click();
  await desktop.locator('#demo').waitFor({state:'visible',timeout:20000});
  await desktop.locator('#matchSelect').locator('option[value="courtB"]').waitFor({state:'attached'});
  assert.equal(await desktop.locator('#role').innerText(),'Autorisé à saisir');
  await desktop.locator('#matchSelect').selectOption('courtB');
  await samsung.locator('#home').fill('5');
  await samsung.locator('#away').fill('3');
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('3');
  await Promise.all([samsung.locator('#send').click(),desktop.locator('#send').click()]);
  try{await samsung.locator('#score').getByText('5 : 3').waitFor({timeout:15000});}
  catch(e){
    const phoneDetails=await samsung.evaluate(()=>({
      score:document.getElementById('score').textContent,
      format:document.getElementById('matchFormat').textContent,
      status:document.getElementById('status').textContent,
      queue:document.getElementById('queue').textContent,
      match:document.getElementById('matchSelect').value
    }));
    const pcDetails=await desktop.evaluate(()=>({
      score:document.getElementById('score').textContent,
      format:document.getElementById('matchFormat').textContent,
      status:document.getElementById('status').textContent,
      queue:document.getElementById('queue').textContent,
      match:document.getElementById('matchSelect').value
    }));
    let remote;
    await env.withSecurityRulesDisabled(async c=>{
      remote=(await c.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
    });
    throw new Error('MAJ96 premier score diagnostic '+JSON.stringify({phoneDetails,pcDetails,remote,errors}),{cause:e});
  }
  try{
   await desktop.locator('#score').getByText('5 : 3').waitFor({timeout:16000});
  }catch(error){
   const diagnostic=await desktop.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_MULTIMATCH_EMULATOR_20261123'});
    const scope={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_MULTI_EMULATOR_DEVICE_ID')};
    const list=await db.list(scope);db.close();
    return {role:document.getElementById('role').textContent,
      active:document.getElementById('matchSelect').value,
      score:document.getElementById('score').textContent,
      status:document.getElementById('status').textContent,
      queue:document.getElementById('queue').textContent,
      events:list.map(x=>({match:x.command.matchId,state:x.state,reason:x.reason,version:x.command.expectedVersion}))};
   });
   let remoteDiagnostic;
   await env.withSecurityRulesDisabled(async ctx=>{
    remoteDiagnostic=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
   });
   throw new Error('MAJ94 second-match diagnostic '+JSON.stringify({diagnostic,remoteDiagnostic,errors}),{cause:error});
  }
  await samsung.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  await desktop.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  assert.match(await desktop.locator('#matchQueue').innerText(),/courtB/);
  let remote;
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.demo.version,1);assert.equal(remote.courtB.version,1);
  assert.deepEqual(remote.demo.sets['0'],{a:5,b:3});
  assert.deepEqual(remote.courtB.sets['0'],{a:5,b:3});
  assert.equal(remote.demo.updatedBy,uidMobile);
  assert.equal(remote.courtB.updatedBy,uidPc);
  // PC offline on demo, Samsung confirms a different demo score.
  await desktop.locator('#matchSelect').selectOption('demo');
  await pc.setOffline(true);
  await desktop.locator('#home').fill('6');
  await desktop.locator('#away').fill('4');
  await desktop.locator('#send').click();
  await desktop.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await samsung.locator('#home').fill('7');
  await samsung.locator('#away').fill('5');
  await samsung.locator('#send').click();
  await samsung.locator('#score').getByText('7 : 5').waitFor({timeout:20000});
  await pc.setOffline(false);
  await desktop.locator('#score').getByText('7 : 5').waitFor({timeout:20000});
  await desktop.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor({timeout:20000});
  assert.match(await desktop.locator('#conflicts').innerText(),/Match demo/);
  assert.match(await desktop.locator('#conflicts').innerText(),/Score local A 6 : B 4/);
  // A conflict in demo must not block courtB.
  await desktop.locator('#matchSelect').selectOption('courtB');
  await desktop.locator('#home').fill('6');
  await desktop.locator('#away').fill('4');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('6 : 4').waitFor({timeout:20000});
  await desktop.locator('#queue').getByText('1 conflit(s)',{exact:false}).waitFor();
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.demo.version,2);
  assert.deepEqual(remote.demo.sets['0'],{a:7,b:5});
  assert.equal(remote.courtB.version,2);
  assert.deepEqual(remote.courtB.sets['0'],{a:6,b:4});

  // MAJ95 : panne dans l'autre sens. Le Samsung conserve courtB hors ligne
  // tandis que le PC poursuit demo sans verrou de tournoi.
  await samsung.locator('#matchSelect').selectOption('courtB');
  await phone.setOffline(true);
  // MAJ96 : 5–4 échoue pour une belle (écart insuffisant).
  await samsung.locator('#home').fill('5');await samsung.locator('#away').fill('4');
  await samsung.locator('#send').click();
  await samsung.locator('#status.error').getByText('Score impossible',{exact:false}).waitFor();
  // MAJ95 corrigée : rejet avant l'enregistrement local d'un score 9-7.
  await samsung.locator('#home').fill('9');
  await samsung.locator('#away').fill('7');
  await samsung.locator('#send').click();
  await samsung.locator('#status.error').getByText('Score impossible',{exact:false}).waitFor();
  await samsung.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  await samsung.locator('#home').fill('8');
  await samsung.locator('#away').fill('7');
  await samsung.locator('#send').click();
  await samsung.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  assert.match(await samsung.locator('#matchQueue').innerText(),/courtB : 1 en attente/);
  await desktop.locator('#matchSelect').selectOption('demo');
  await desktop.locator('#home').fill('8');
  await desktop.locator('#away').fill('6');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('8 : 6').waitFor({timeout:20000});
  await phone.setOffline(false);
  await samsung.locator('#score').getByText('8 : 7').waitFor({timeout:20000});
  await samsung.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  await samsung.locator('#queue').getByText('0 conflit(s)',{exact:false}).waitFor();
  await samsung.locator('#matchSelect').selectOption('demo');
  await samsung.locator('#score').getByText('8 : 6').waitFor({timeout:20000});
  await desktop.locator('#matchSelect').selectOption('courtB');
  await desktop.locator('#score').getByText('8 : 7').waitFor({timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.demo.version,3,'PC sends demo during phone outage');
  assert.equal(remote.courtB.version,3,'Samsung resumes courtB after reconnect');
  assert.deepEqual(remote.demo.sets['0'],{a:8,b:6});
  assert.deepEqual(remote.courtB.sets['0'],{a:8,b:7});
  assert.equal(remote.demo.updatedBy,uidPc);
  assert.equal(remote.courtB.updatedBy,uidMobile);

  // MAJ95 : même score déposé par les deux appareils. Le brouillon local
  // est acquitté sans changer la version ni l'auteur confirmé sur PC.
  await phone.setOffline(true);
  await samsung.locator('#home').fill('5');
  await samsung.locator('#away').fill('3');
  await samsung.locator('#send').click();
  await samsung.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  await desktop.locator('#matchSelect').selectOption('demo');
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('3');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await phone.setOffline(false);
  await samsung.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await samsung.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  await samsung.locator('#queue').getByText('0 conflit(s)',{exact:false}).waitFor();
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.demo.version,4,'Identical score adds no second version');
  assert.equal(remote.demo.updatedBy,uidPc,'Existing PC score cannot be overwritten');
  assert.equal(remote.courtB.version,3,'Other match unaffected');
  assert.deepEqual(remote.demo.sets['0'],{a:5,b:3});
  // MAJ97 : deux brouillons NON envoyés doivent survivre au rechargement et
  // rester attachés uniquement au match / UID / appareil qui les a saisis.
  await samsung.locator('#newMatch').fill('draftA');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await samsung.locator('#matchSelect').locator('option[value="draftA"]').waitFor({state:'attached'});
  await samsung.locator('#newMatch').fill('draftB');
  await samsung.locator('#newMatchFormat').selectOption('partie7');
  await samsung.locator('#createMatch').click();
  await samsung.locator('#matchSelect').locator('option[value="draftB"]').waitFor({state:'attached'});
  await desktop.locator('#matchSelect').locator('option[value="draftA"]').waitFor({state:'attached'});
  await samsung.locator('#matchSelect').selectOption('draftA');
  await samsung.locator('#home').fill('5');
  await samsung.locator('#away').fill('3');
  await samsung.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor();
  await samsung.locator('#matchSelect').selectOption('draftB');
  await samsung.locator('#home').fill('7');
  await samsung.locator('#away').fill('6');
  assert.equal(await samsung.locator('#home').inputValue(),'7');
  await samsung.locator('#matchSelect').selectOption('draftA');
  assert.equal(await samsung.locator('#home').inputValue(),'5');
  assert.equal(await samsung.locator('#away').inputValue(),'3');
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.draftA.version,0,'Unsent draftA must not update Firebase');
  assert.equal(remote.draftB.version,0,'Unsent draftB must not update Firebase');
  // La page est rechargée ; les identités Auth sont persistées par le SDK de test.
  await samsung.reload();
  await samsung.locator('#rooms').waitFor({state:'visible',timeout:20000});
  await samsung.locator('#trialId').fill(room);
  await samsung.locator('#join').click();
  await samsung.locator('#demo').waitFor({state:'visible',timeout:20000});
  await samsung.locator('#matchSelect').locator('option[value="draftA"]').waitFor({state:'attached'});
  await samsung.locator('#matchSelect').selectOption('draftA');
  assert.equal(await samsung.locator('#home').inputValue(),'5','DraftA home persists');
  assert.equal(await samsung.locator('#away').inputValue(),'3','DraftA away persists');
  await samsung.locator('#matchSelect').selectOption('draftB');
  assert.equal(await samsung.locator('#home').inputValue(),'7','DraftB home persists');
  assert.equal(await samsung.locator('#away').inputValue(),'6','DraftB away persists');
  // Le PC confirme draftA avant la transmission Samsung : aucune suppression
  // spontanée du brouillon local, ni deuxième version lors de son envoi.
  await desktop.locator('#matchSelect').selectOption('draftA');
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('3');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await samsung.locator('#matchSelect').selectOption('draftA');
  await samsung.locator('#draftNotice').getByText('score distant a changé',{exact:false}).waitFor({timeout:20000});
  assert.equal(await samsung.locator('#home').inputValue(),'5','Remote update must preserve draft inputs');
  await samsung.locator('#send').click();
  await samsung.locator('#queue').getByText('0 en attente',{exact:false}).waitFor({timeout:20000});
  await samsung.locator('#queue').getByText('0 conflit(s)',{exact:false}).waitFor({timeout:20000});
  await samsung.waitForFunction(()=>document.getElementById('draftNotice').textContent==='',null,{timeout:20000});
  assert.equal(await samsung.locator('#draftNotice').innerText(),'','Acknowledged draft should be cleared after IndexedDB enqueue');
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.draftA.version,1,'Same-score late acknowledgment must not duplicate version');
  assert.equal(remote.draftA.updatedBy,uidPc,'Remote PC authorship preserved');
  assert.equal(remote.draftB.version,0,'DraftB remains independent');
  await samsung.locator('#matchSelect').selectOption('draftB');
  assert.equal(await samsung.locator('#home').inputValue(),'7','DraftB remains after acknowledgment of draftA');
  assert.equal(await samsung.locator('#away').inputValue(),'6');
  await samsung.reload();
  await samsung.locator('#rooms').waitFor({state:'visible',timeout:20000});
  await samsung.locator('#trialId').fill(room);
  await samsung.locator('#join').click();
  await samsung.locator('#demo').waitFor({state:'visible',timeout:20000});
  await samsung.locator('#matchSelect').selectOption('draftA');
  assert.equal(await samsung.locator('#draftNotice').innerText(),'','Acknowledged draftA cannot reappear after reload');
  await samsung.locator('#matchSelect').selectOption('draftB');
  assert.equal(await samsung.locator('#home').inputValue(),'7','Untouched draftB survives repeated reload');
  await samsung.locator('#send').click();
  await samsung.locator('#score').getByText('7 : 6').waitFor({timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.draftB.version,1,'DraftB confirmed exactly once');
  assert.equal(remote.draftB.updatedBy,uidMobile,'DraftB author preserved');
  assert.equal(await desktop.locator('#matchQueue').innerText().then(x=>x.includes('draftB')),true);
  // MAJ98 : simuler quota localStorage atteint (sans toucher aux vraies données).
  // Le changement de match/salle et la déconnexion sont bloqués tant que la
  // dernière édition n'a pas été durablement sauvée.
  await samsung.locator('#newMatch').fill('storage98');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await samsung.locator('#matchSelect').locator('option[value="storage98"]').waitFor({state:'attached'});
  await samsung.locator('#matchSelect').selectOption('storage98');
  await samsung.evaluate(()=>{
    window.__draftStoreSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,value){
      if(typeof k==='string'&&k.startsWith('MILFT_V2_MULTI_EMULATOR_DRAFT97_'))throw new DOMException('Quota dépassé','QuotaExceededError');
      return window.__draftStoreSet.call(this,k,value);
    };
  });
  await samsung.locator('#home').fill('5');
  await samsung.locator('#away').fill('3');
  await samsung.locator('#draftNotice').getByText('saisie non sauvegardée',{exact:false}).waitFor();
  await samsung.locator('#matchSelect').selectOption('draftB');
  assert.equal(await samsung.locator('#matchSelect').inputValue(),'storage98','Cannot switch with unsaved input');
  assert.equal(await samsung.locator('#home').inputValue(),'5');
  await samsung.locator('#create').click();
  assert.equal(await samsung.locator('#trialId').inputValue(),room,'Cannot create room while data unsaved');
  await samsung.locator('#signOut').click();
  assert.equal(await samsung.locator('#who').inputValue(),uidMobile,'Cannot sign out with unsaved input');
  await samsung.evaluate(()=>{
    Storage.prototype.setItem=window.__draftStoreSet;
    delete window.__draftStoreSet;
  });
  await samsung.locator('#away').fill('2');
  await samsung.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor();
  await samsung.locator('#matchSelect').selectOption('draftB');
  await samsung.locator('#matchSelect').selectOption('storage98');
  assert.equal(await samsung.locator('#away').inputValue(),'2','Recovered draft after quota restored');
  await samsung.locator('#send').click();
  await samsung.locator('#score').getByText('5 : 2').waitFor({timeout:20000});
  // MAJ99 : deux onglets du MÊME PC partagent le stockage, mais le plus
  // ancien ne doit jamais émettre le brouillon remplacé par le nouveau.
  await samsung.locator('#newMatch').fill('dual99');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await desktop.locator('#matchSelect').locator('option[value="dual99"]').waitFor({state:'attached'});
  await desktop.locator('#matchSelect').selectOption('dual99');
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('2');
  const tab2=await pc.newPage();
  tab2.on('pageerror',e=>errors.push(e.message));
  await tab2.goto(url);
  await tab2.locator('#rooms').waitFor({state:'visible',timeout:20000});
  await tab2.locator('#trialId').fill(room);
  await tab2.locator('#join').click();
  await tab2.locator('#demo').waitFor({state:'visible',timeout:20000});
  await tab2.locator('#matchSelect').selectOption('dual99');
  await tab2.locator('#home').fill('5');
  await tab2.locator('#away').fill('3');
  // MAJ100 : le PREMIER onglet tente de ressauver son ancien 5–2 alors
  // que le second a enregistré 5–3. Sa nouvelle édition 5–1 doit rester
  // affichée, sans remplacer le 5–3 dans le stockage partagé.
  await tab2.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor();
  await desktop.locator('#away').fill('1');
  await desktop.locator('#draftNotice').getByText('Conflit entre onglets',{exact:false}).waitFor();
  assert.equal(await desktop.locator('#away').inputValue(),'1','Stale tab retains its displayed value');
  const stored=await tab2.evaluate(()=>{
   const k=Object.keys(localStorage).find(x=>x.startsWith('MILFT_V2_MULTI_EMULATOR_DRAFT97_')&&x.includes('"dual99"'));
   return k?JSON.parse(localStorage.getItem(k)):null;
  });
  assert.equal(stored.b,'3','Older tab cannot overwrite newer stored draft');
  assert.equal(await desktop.locator('#send').isDisabled(),true,'Stale tab cannot send');
  await desktop.locator('#restoreDraft').click();
  assert.equal(await desktop.locator('#away').inputValue(),'3','Explicit reload chooses newer saved draft');
  // Le dernier onglet envoie 5–3 ; aucun autre score concurrent n'est émis.
  await tab2.locator('#send').click();
  await desktop.locator('#queue').getByText('0 en attente',{exact:false}).waitFor();
  await tab2.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.dual99.version,1,'Only latest-tab draft may be sent');
  assert.deepEqual(remote.dual99.sets['0'],{a:5,b:3});
  await tab2.close();
  // L'onglet auteur a retiré son brouillon après insertion en file ; l'ancien
  // onglet doit reconnaître la suppression comme un changement externe,
  // puis demander un rechargement explicite avant toute navigation.
  await desktop.locator('#draftNotice').getByText('Conflit entre onglets',{exact:false}).waitFor();
  await desktop.locator('#restoreDraft').click();
  assert.equal(await desktop.locator('#draftNotice').innerText(),'');
  // MAJ101 : le signal storage d'un changement survenu en arrière-plan
  // peut ne pas avoir été reçu. Le pageshow vérifie le jeton persistant.
  await samsung.locator('#newMatch').fill('foreground101');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await desktop.locator('#matchSelect').locator('option[value="foreground101"]').waitFor({state:'attached'});
  await desktop.locator('#matchSelect').selectOption('foreground101');
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('2');
  await desktop.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor();
  await desktop.evaluate(()=>{
   const k=Object.keys(localStorage).find(x=>x.startsWith('MILFT_V2_MULTI_EMULATOR_DRAFT97_')&&x.includes('"foreground101"'));
   if(!k)throw Error('foreground101 draft not persisted');
   const value=JSON.parse(localStorage.getItem(k));
   localStorage.setItem(k,JSON.stringify({...value,b:'3',token:'replacement101'}));
   // Modification faite dans cet onglet : pas d'événement storage pour lui.
   window.dispatchEvent(new Event('pageshow'));
  });
  await desktop.locator('#draftNotice').getByText('Conflit entre onglets',{exact:false}).waitFor();
  assert.equal(await desktop.locator('#away').inputValue(),'2','Foreground mismatch cannot erase displayed draft');
  assert.equal(await desktop.locator('#send').isDisabled(),true,'Foreground mismatch cannot send');
  await desktop.locator('#restoreDraft').click();
  assert.equal(await desktop.locator('#away').inputValue(),'3','Foreground recovery is explicit');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.foreground101.version,1);
  assert.deepEqual(remote.foreground101.sets['0'],{a:5,b:3});
  // MAJ102 : reconnexion simultanée de deux onglets du même PC.
  // Le second onglet conserve une saisie valide hors connexion ; l'onglet
  // ancien ne peut ni écraser le stockage ni injecter un deuxième score.
  await samsung.locator('#newMatch').fill('reconnect102');
  await samsung.locator('#newMatchFormat').selectOption('belle5');
  await samsung.locator('#createMatch').click();
  await desktop.locator('#matchSelect').locator('option[value="reconnect102"]').waitFor({state:'attached'});
  const reconnectTab=await pc.newPage();
  reconnectTab.on('pageerror',err=>errors.push(err.message));
  await reconnectTab.goto(url);
  await reconnectTab.locator('#rooms').waitFor({state:'visible',timeout:20000});
  await reconnectTab.locator('#trialId').fill(room);
  await reconnectTab.locator('#join').click();
  await reconnectTab.locator('#demo').waitFor({state:'visible',timeout:20000});
  await reconnectTab.locator('#matchSelect').locator('option[value="reconnect102"]').waitFor({state:'attached'});
  await desktop.locator('#matchSelect').selectOption('reconnect102');
  await reconnectTab.locator('#matchSelect').selectOption('reconnect102');
  await pc.setOffline(true);
  await desktop.locator('#home').fill('5');
  await desktop.locator('#away').fill('2');
  await desktop.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor();
  // Le deuxième onglet était ouvert avant l'enregistrement du premier :
  // relire explicitement la dernière version locale avant de la modifier.
  // Un onglet obsolète n'a jamais le droit de prendre la main tout seul.
  await reconnectTab.locator('#matchSelect').selectOption('demo');
  await reconnectTab.locator('#matchSelect').selectOption('reconnect102');
  assert.equal(await reconnectTab.locator('#away').inputValue(),'2','Second tab reloads saved local version');
  await reconnectTab.locator('#home').fill('5');
  await reconnectTab.locator('#away').fill('3');
  try{
   await reconnectTab.locator('#draftNotice').getByText('Brouillon non envoyé',{exact:false}).waitFor({timeout:10000});
  }catch(error){
   const diagnostics=await Promise.all([desktop,reconnectTab].map(page=>page.evaluate(()=>({
    notice:document.querySelector('#draftNotice')?.textContent,
    status:document.querySelector('#status')?.textContent,
    role:document.querySelector('#role')?.textContent,
    match:document.querySelector('#matchSelect')?.value,
    scoreA:document.querySelector('#home')?.value,
    scoreB:document.querySelector('#away')?.value,
    local:Object.keys(localStorage).filter(k=>k.includes('reconnect102')).map(k=>({key:k,value:localStorage.getItem(k)}))
   }))));
   throw new Error('MAJ102 offline draft diagnostic '+JSON.stringify(diagnostics),{cause:error});
  }
  await desktop.locator('#draftNotice').getByText('Conflit entre onglets',{exact:false}).waitFor();
  await reconnectTab.locator('#send').click();
  await reconnectTab.locator('#queue').getByText('1 en attente',{exact:false}).waitFor();
  assert.equal(await desktop.locator('#send').isDisabled(),true,'Stale offline tab cannot send');
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches/reconnect102').once('value')).val();
  });
  assert.equal(remote.version,0,'Offline score not yet transmitted');
  await pc.setOffline(false);
  await reconnectTab.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await reconnectTab.locator('#queue').getByText('0 en attente',{exact:false}).waitFor({timeout:20000});
  // Un conflit ancien sur demo reste volontairement conservé : vérifier uniquement reconnect102.
  // Contrôler la file persistante directement plutôt que l'affichage dérivé,
  // qui peut être en retard par rapport à l'acquittement du match.
  await reconnectTab.waitForFunction(async()=>{
    const db=await window.MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_MULTIMATCH_EMULATOR_20261123'});
    try{
      const scope={tournamentId:document.querySelector('#trialId').value,
        actorId:document.querySelector('#who').value,
        deviceId:localStorage.getItem('MILFT_V2_MULTI_EMULATOR_DEVICE_ID')};
      const items=(await db.list(scope)).filter(x=>x.command.matchId==='reconnect102');
      return items.length>0&&!items.some(x=>['pending','sending','conflict','blocked'].includes(x.state));
    }finally{db.close();}
  },null,{timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches/reconnect102').once('value')).val();
  });
  assert.equal(remote.version,1,'Two tabs resumed: exactly one confirmed event');
  assert.deepEqual(remote.sets['0'],{a:5,b:3},'Only latest saved draft sent');
  assert.equal(remote.updatedBy,uidPc,'PC author preserved');
  await desktop.locator('#draftNotice').getByText('Conflit entre onglets',{exact:false}).waitFor();
  assert.equal(await desktop.locator('#away').inputValue(),'2','Stale draft remains readable after reconnect');
  await desktop.locator('#restoreDraft').click();
  assert.equal(await desktop.locator('#draftNotice').innerText(),'','Explicit recovery clears stale state');
  await desktop.locator('#score').getByText('5 : 3').waitFor({timeout:20000});
  await reconnectTab.close();
  // MAJ103 : deux matchs indépendants lors d'une même coupure du Samsung.
  for(const mid of ['late103A','late103B']){
   await samsung.locator('#newMatch').fill(mid);
   await samsung.locator('#newMatchFormat').selectOption('belle5');
   await samsung.locator('#createMatch').click();
   await samsung.locator('#matchSelect').locator('option[value="'+mid+'"]').waitFor({state:'attached'});
   await desktop.locator('#matchSelect').locator('option[value="'+mid+'"]').waitFor({state:'attached'});
  }
  await phone.setOffline(true);
  for(const [mid,a,b] of [['late103A','5','2'],['late103B','6','4']]){
   await samsung.locator('#matchSelect').selectOption(mid);
   await samsung.locator('#home').fill(a);await samsung.locator('#away').fill(b);
   await samsung.locator('#send').click();
   await samsung.locator('#matchQueue').getByText(mid+' : 1 en attente',{exact:false}).waitFor({timeout:20000});
  }
  await samsung.locator('#queue').getByText('2 en attente',{exact:false}).waitFor({timeout:20000});
  await desktop.locator('#matchSelect').selectOption('late103A');
  await desktop.locator('#home').fill('7');await desktop.locator('#away').fill('5');
  await desktop.locator('#send').click();
  await desktop.locator('#score').getByText('7 : 5').waitFor({timeout:20000});
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.late103A.version,1,'PC confirms A while Samsung is offline');
  assert.equal(remote.late103B.version,0,'B remains untouched while offline');
  await phone.setOffline(false);
  await samsung.locator('#matchQueue').getByText('late103A : 0 en attente, 0 en cours, 1 conflit(s)',{exact:false}).waitFor({timeout:25000});
  await samsung.locator('#matchQueue').getByText('late103B : 0 en attente, 0 en cours, 0 conflit(s)',{exact:false}).waitFor({timeout:25000});
  await samsung.locator('#score').getByText('6 : 4').waitFor({timeout:20000});
  const localConflicts103=await samsung.locator('#conflicts').innerText();
  assert.match(localConflicts103,/Match late103A/);
  assert.match(localConflicts103,/Score local A 5 : B 2/);
  assert.doesNotMatch(localConflicts103,/Match late103B/);
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.late103A.version,1,'Late ack never overwrites A');
  assert.equal(remote.late103B.version,1,'B confirms independently');
  assert.deepEqual(remote.late103A.sets['0'],{a:7,b:5});
  assert.deepEqual(remote.late103B.sets['0'],{a:6,b:4});
  assert.equal(remote.late103A.updatedBy,uidPc);
  assert.equal(remote.late103B.updatedBy,uidMobile);
  await samsung.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await samsung.locator('#matchQueue').getByText('late103A : 0 en attente, 0 en cours, 1 conflit(s)',{exact:false}).waitFor();
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.late103A.version,1);
  assert.equal(remote.late103B.version,1);
  // MAJ104 : deux coupures successives sur les mêmes deux matchs.
  // Chaque aller-retour hors-ligne / en-ligne transmet UNE SEULE fois
  // chaque commande. Les réveils répétés ne créent aucune version fantôme.
  for(const mid of ['flap104A','flap104B']){
   await samsung.locator('#newMatch').fill(mid);
   await samsung.locator('#newMatchFormat').selectOption('belle5');
   await samsung.locator('#createMatch').click();
   await samsung.locator('#matchSelect').locator('option[value="'+mid+'"]').waitFor({state:'attached'});
   await desktop.locator('#matchSelect').locator('option[value="'+mid+'"]').waitFor({state:'attached'});
  }
  const flapRounds=[
   [{mid:'flap104A',a:5,b:3},{mid:'flap104B',a:5,b:2}],
   [{mid:'flap104A',a:6,b:4},{mid:'flap104B',a:7,b:5}]
  ];
  for(let round=0;round<flapRounds.length;round++){
   const scores=flapRounds[round];
   await phone.setOffline(true);
   for(const {mid,a,b} of scores){
    await samsung.locator('#matchSelect').selectOption(mid);
    await samsung.locator('#home').fill(String(a));
    await samsung.locator('#away').fill(String(b));
    await samsung.locator('#send').click();
    await samsung.locator('#matchQueue').getByText(mid+' : 1 en attente',{exact:false}).waitFor({timeout:20000});
   }
   await env.withSecurityRulesDisabled(async ctx=>{
    remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
   });
   for(const {mid} of scores)assert.equal(remote[mid].version,round,'No writes while offline: '+mid);
   await phone.setOffline(false);
   for(const {mid,a,b} of scores){
    await samsung.locator('#matchSelect').selectOption(mid);
    await samsung.locator('#score').getByText(a+' : '+b).waitFor({timeout:25000});
    await desktop.locator('#matchSelect').selectOption(mid);
    await desktop.locator('#score').getByText(a+' : '+b).waitFor({timeout:25000});
   }
   // Ne pas se contenter du score affiché : attendre l'acquittement réel
   // des deux commandes de cette génération dans la file IndexedDB.
   await samsung.waitForFunction(async()=>{
    const outbox=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_MULTIMATCH_EMULATOR_20261123'});
    try{
     const scope={tournamentId:document.getElementById('trialId').value,
      actorId:document.getElementById('who').value,
      deviceId:localStorage.getItem('MILFT_V2_MULTI_EMULATOR_DEVICE_ID')};
     const items=(await outbox.list(scope)).filter(x=>['flap104A','flap104B'].includes(x.command.matchId));
     return !items.some(x=>['pending','sending','conflict','blocked'].includes(x.state));
    }finally{outbox.close();}
   },null,{timeout:25000});
   await env.withSecurityRulesDisabled(async ctx=>{
    remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
   });
   for(const {mid,a,b} of scores){
    assert.equal(remote[mid].version,round+1,'Exactly one remote version per round: '+mid);
    assert.deepEqual(remote[mid].sets['0'],{a,b},'Correct score for '+mid);
    assert.equal(remote[mid].updatedBy,uidMobile,'Author remains Samsung for '+mid);
   }
  }
  // Deux reconnexions sans nouvelle saisie ne doivent PAS rejouer les reçus.
  for(let count=0;count<2;count++){
   await phone.setOffline(true);
   await phone.setOffline(false);
   await samsung.evaluate(()=>{window.dispatchEvent(new Event('pageshow'));});
  }
  await env.withSecurityRulesDisabled(async ctx=>{
   remote=(await ctx.database(databaseURL).ref('v2Trials/'+room+'/matches').once('value')).val();
  });
  assert.equal(remote.flap104A.version,2,'No duplicate on repeated empty reconnect: A');
  assert.equal(remote.flap104B.version,2,'No duplicate on repeated empty reconnect: B');
  // MAJ105 : baux, retryAt, accusés périmés et reprise INDEPENDANTE
  // de deux matchs, via la même IndexedDB du prototype multi-match.
  // Portée 105 fictive, sans aucune opération Firebase réelle ni écran V1.1.
  const lease105=await samsung.evaluate(async()=>{
   const scope={tournamentId:'trial105synthetic',actorId:'actor105',deviceId:'phone105'};
   const store=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_MULTIMATCH_EMULATOR_20261123'});
   const make=(id,mid,a,b)=>({...scope,id,matchId:mid,type:'set.record',
    format:'belle5',expectedVersion:0,setIndex:0,goals:{a,b}});
   try{
    await store.enqueue(scope,make('evt105A','match105A',5,3),1000,{chainLocalScore:true});
    await store.enqueue(scope,make('evt105B','match105B',6,4),1001,{chainLocalScore:true});
    const first=await store.claimNext(scope,{now:1100,leaseMs:1000});
    const deferred=await store.finish(scope,first.command.id,first.leaseToken,'temporary-error',
     {now:1110,reason:'temporary disconnect',retryAfterMs:6000});
    // A est temporisé jusqu'à 7110 : B ne doit pas attendre son délai.
    const second=await store.claimNext(scope,{now:1200,leaseMs:1000});
    const secondDone=await store.finish(scope,second.command.id,second.leaseToken,'applied',{now:1210});
    const premature=await store.claimNext(scope,{now:7000,leaseMs:1000});
    const resumed=await store.claimNext(scope,{now:7111,leaseMs:1000});
    const unexpired=await store.claimNext(scope,{now:7300,leaseMs:1000});
    // Le bail est expiré, l'autre onglet peut le réclamer.
    const replacement=await store.claimNext(scope,{now:8112,leaseMs:1000});
    const stale=await store.finish(scope,resumed.command.id,resumed.leaseToken,'applied',{now:8120});
    const confirmed=await store.finish(scope,replacement.command.id,replacement.leaseToken,'applied',{now:8130});
    const replay=await store.enqueue(scope,make('evt105A','match105A',5,3),8140,{chainLocalScore:true});
    const remaining=await store.list(scope);
    return {first:first?.command.id,deferred,second:second?.command.id,
     secondDone:secondDone.status,premature,resumed:resumed?.command.id,
     unexpired,replacement:replacement?.command.id,oldToken:resumed?.leaseToken,
     newToken:replacement?.leaseToken,stale:stale.status,confirmed:confirmed.status,
     replay:replay.status,remaining:remaining.length};
   }finally{store.close();}
  });
  assert.equal(lease105.first,'evt105A');
  assert.equal(lease105.deferred.status,'pending');
  assert.equal(lease105.deferred.retryAt,7110);
  assert.equal(lease105.second,'evt105B','Unrelated match B must progress while A waits');
  assert.equal(lease105.secondDone,'confirmed');
  assert.equal(lease105.premature,null,'A cannot bypass retryAt');
  assert.equal(lease105.resumed,'evt105A','A resumes only after retry deadline');
  assert.equal(lease105.unexpired,null,'Unexpired sending lease is exclusive');
  assert.equal(lease105.replacement,'evt105A','Expired lease can be reclaimed');
  assert.notEqual(lease105.oldToken,lease105.newToken,'Lease token must rotate');
  assert.equal(lease105.stale,'stale-lease','Late acknowledgment cannot erase reclaimed command');
  assert.equal(lease105.confirmed,'confirmed');
  assert.equal(lease105.replay,'already-confirmed','Confirmed ID is idempotent');
  assert.equal(lease105.remaining,0,'Both independent matches completely acknowledged');
  // MAJ106 : une commande en pause après échecs successifs ne doit
  // bloquer ni un autre match, ni reprendre sans geste explicite.
  const pause106=await samsung.evaluate(async()=>{
   const scope={tournamentId:'trial106synthetic',actorId:'actor106',deviceId:'phone106'};
   const outbox=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_MULTIMATCH_EMULATOR_20261123'});
   const mk=(id,mid,goals)=>({...scope,id,matchId:mid,type:'set.record',
    format:'belle5',expectedVersion:0,setIndex:0,goals});
   try{
    await outbox.enqueue(scope,mk('evt106A','match106A',{a:5,b:3}),1000,{chainLocalScore:true});
    await outbox.enqueue(scope,mk('evt106B','match106B',{a:6,b:4}),1001,{chainLocalScore:true});
    const first=await outbox.claimNext(scope,{now:1100,leaseMs:1000});
    const failure1=await outbox.finish(scope,first.command.id,first.leaseToken,'temporary-error',
     {now:1110,retryAfterMs:2000,reason:'network error 1'});
    const retryTooSoon=await outbox.claimNext(scope,{now:2000,leaseMs:1000});
    const retry=await outbox.claimNext(scope,{now:3111,leaseMs:1000});
    const failure2=await outbox.finish(scope,retry.command.id,retry.leaseToken,'temporary-error',
     {now:3120,retryAfterMs:3000,reason:'network error 2'});
    const other=await outbox.claimNext(scope,{now:4000,leaseMs:1000});
    const otherDone=await outbox.finish(scope,other.command.id,other.leaseToken,'applied',{now:4001});
    const repeated=await outbox.claimNext(scope,{now:6121,leaseMs:1000});
    const paused=await outbox.finish(scope,repeated.command.id,repeated.leaseToken,'temporary-error',
     {now:6130,reason:'too many transient errors',pauseRetry:true});
    const cannotAutoResume=await outbox.claimNext(scope,{now:500000,leaseMs:1000});
    const forced=await outbox.claimNext(scope,{now:500001,leaseMs:1000,ignoreRetryAt:true});
    const confirmed=await outbox.finish(scope,forced.command.id,forced.leaseToken,'applied',{now:500002});
    const result=await outbox.list(scope);
    return {first:first.command.id,failure1,failure2,retryTooSoon,retry:retry?.command.id,
     other:other?.command.id,otherDone:otherDone.status,repeated:repeated?.command.id,
     paused,cannotAutoResume,forced:forced?.command.id,confirmed:confirmed.status,
     remaining:result.length};
   }finally{outbox.close();}
  });
  assert.equal(pause106.first,'evt106A');
  assert.equal(pause106.failure1.retryAt,3110);
  assert.equal(pause106.retryTooSoon?.command?.id,'evt106B','B continues during the first retry delay');
  // The previous claim is held; after its lease expires B is reclaimable.
  assert.equal(pause106.retry,'evt106A');
  assert.equal(pause106.failure2.retryAt,6120);
  assert.equal(pause106.other,'evt106B');
  assert.equal(pause106.otherDone,'confirmed');
  assert.equal(pause106.repeated,'evt106A');
  assert.equal(pause106.paused.retryPaused,true);
  assert.equal(pause106.cannotAutoResume,null,'Paused command must never retry itself');
  assert.equal(pause106.forced,'evt106A','Explicit retry unlocks only the selected queue');
  assert.equal(pause106.confirmed,'confirmed');
  assert.equal(pause106.remaining,0,'No unfinished commands after explicit retry');
  // Vérifier aussi la saisie en lecture seule : les valeurs affichées
  // ne peuvent plus être modifiées tant que le propriétaire n'a pas
  // restauré le rôle éditeur (les autres brouillons locaux sont conservés).
  // Le Samsung et le PC ne doivent jamais partager leurs brouillons non envoyés.
  // Le PC, pour draftB, n'avait ni brouillon ni transmission locale.
  await desktop.locator('#matchSelect').selectOption('draftB');
  assert.equal(await desktop.locator('#draftNotice').innerText(),'');
  // Après reload la page a perdu les champs de formulaire non sauvegardés.
  // Renseigner de nouveau le destinataire des droits, sans toucher aux brouillons.
  await samsung.locator('#invited').fill(uidPc);
  await samsung.locator('#permission').selectOption('viewer');
  await samsung.locator('#invite').click();
  await desktop.locator('#role').getByText('Lecture seule').waitFor({timeout:15000});
  assert.equal(await desktop.locator('#send').isDisabled(),true);
  assert.equal(await desktop.locator('#home').getAttribute('readonly'),'');
  assert.equal(await desktop.locator('#away').getAttribute('readonly'),'');
  await samsung.locator('#permission').selectOption('editor');
  await samsung.locator('#invite').click();
  await desktop.locator('#role').getByText('Autorisé à saisir').waitFor();
  assert.equal(await desktop.locator('#home').getAttribute('readonly'),null);
  assert.equal(await desktop.locator('#away').getAttribute('readonly'),null);
  await samsung.locator('#revoke').click();
  await desktop.locator('#demo').waitFor({state:'hidden',timeout:15000});
  assert.equal(await desktop.locator('#conflicts').innerText(),'');
  assert.equal(await desktop.locator('#score').innerText(),'— : —');
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log('OK MAJ96: formats and two identities, two independent matches, PC network loss, conflict isolation and rights');
 }finally{
  await Promise.allSettled([phone.close(),pc.close()]);
  await browser.close();await env.cleanup();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
