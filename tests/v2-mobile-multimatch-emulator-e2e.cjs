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
  await reconnectTab.locator('#queue').getByText('0 conflit(s)',{exact:false}).waitFor();
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
