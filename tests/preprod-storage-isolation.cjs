/* MILFT V1.1 — recette ciblée PREPRODUCTION / VALIDATION côte à côte.
   Données entièrement fictives. Aucune sauvegarde réelle incluse, aucune écriture sur production.
   Sur Windows runner : test Google Chrome installé, sans prétendre certifier Windows 11 physique.
*/
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const engineName=process.env.MILFT_ENGINE||'chromium';
assert(['chromium','webkit'].includes(engineName),'Navigateur non pris en charge');
const ROOT=process.cwd();
const VALID='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const PRE='MILFT_Tournois_V1_1_PREPRODUCTION_STOCKAGE_ISOLE_2026-11-17.html';
const KEY_VALID='milft_iso_20261102_tournois_v01';
const KEY_PRE='milft_preprod_v11_20261117_tournois_v01';
const ARCHIVE_PRE='MILFT_PREPROD_V11_20261117_SECOURS';
const legacyKey='milft_tournois_v01';
const fixturePlayers=[{id:'P-ALICE',first:'Alice',last:'TEST'},{id:'P-BOB',first:'Bob',last:'TEST'}];
const fixture=(id)=>({
 id,name:'Recette isolée '+id,mode:'poules',discipline:'single',
 date:'2026-11-17',closed:true,roster:fixturePlayers.map(p=>({...p})),
 tables:[{id:1,state:'free'}],
 matches:[{id:id+'-MATCH',a:'P-ALICE',b:'P-BOB',
   status:'done',table:null,round:1,score:{a:5,b:3},sets:[{a:5,b:3}]}]
});
async function serve(){
 const server=http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html'}
  catch{res.writeHead(400).end();return}
  const target=path.resolve(ROOT,name);
  if(!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
  fs.readFile(target,(err,data)=>{
   if(err){res.writeHead(404).end();return}
   const ext=path.extname(target);
   const type=ext==='.html'?'text/html; charset=utf-8':
    ext==='.png'?'image/png':
    ext==='.json'||ext==='.webmanifest'?'application/json':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
  });
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 return {server,origin:'http://127.0.0.1:'+server.address().port};
}
async function saveFixture(page,id){
 return page.evaluate(({people,t})=>{
  db.players=people;db.tournaments=[t];db.selected=null;save();
  return {id:db.tournaments[0].id,
   stored:localStorage.getItem('milft_iso_20261102_tournois_v01')};
 },{people:fixturePlayers,t:fixture(id)});
}
async function showBackup(page){
 await page.locator('#milft-settings-toggle').click();
 const section=page.locator('#milft-settings details.settings-backup');
 await section.locator(':scope > summary').click();
 await section.locator('#milft-backup button').first().waitFor({state:'visible'});
 return section;
}
async function archives(page){
 return page.evaluate(name=>new Promise((resolve,reject)=>{
  const req=indexedDB.open(name,1);
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains('archives'))
    req.result.createObjectStore('archives',{keyPath:'id'});
  };
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const database=req.result;
   const tx=database.transaction('archives','readonly');
   const request=tx.objectStore('archives').getAll();
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    resolve(request.result.map(x=>({id:x.id,
     tournaments:x.payload?.data?.tournaments?.map(t=>t.id)||[]})));
    database.close();
   };
  };
 }),ARCHIVE_PRE);
}
async function main(){
 const {server,origin}=await serve();let browser,context;
 try{
  const opts={headless:true};
  if(engineName==='chromium'&&process.env.MILFT_BROWSER_CHANNEL)opts.channel=process.env.MILFT_BROWSER_CHANNEL;
  browser=await ({chromium,webkit}[engineName]).launch(opts);
  context=await browser.newContext(engineName==='webkit'?{
   viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true
  }:{viewport:{width:1366,height:768},deviceScaleFactor:1,acceptDownloads:true});
  const validation=await context.newPage();
  const errors=[];
  validation.on('pageerror',e=>errors.push('validation: '+e.message));
  await validation.goto(origin+'/'+VALID,{waitUntil:'domcontentloaded'});
  const first=await saveFixture(validation,'VALIDATION-KEEP');
  assert(first.stored,'La référence de validation fictive est absente du stockage');
  await validation.evaluate(k=>localStorage.setItem(k,'DO-NOT-TOUCH'),legacyKey);

  const preprod=await context.newPage();
  preprod.on('pageerror',e=>errors.push('préproduction: '+e.message));
  await preprod.goto(origin+'/'+PRE,{waitUntil:'domcontentloaded'});
  const before=await preprod.evaluate(({valid,pre,legacy})=>({
   tournaments:db.tournaments.length,
   valid:localStorage.getItem(valid),pre:localStorage.getItem(pre),
   legacy:localStorage.getItem(legacy),
   title:document.title,hasManifest:!!document.querySelector('link[rel="manifest"]')
  }),{valid:KEY_VALID,pre:KEY_PRE,legacy:legacyKey});
  assert.equal(before.tournaments,0,'La préproduction a chargé les tournois de validation');
  assert.equal(before.valid,first.stored,'La préproduction a altéré le profil de validation');
  assert.equal(before.legacy,'DO-NOT-TOUCH','Une ancienne clé de production a été modifiée');
  assert.equal(before.hasManifest,false,'La copie de laboratoire conserve un manifeste PWA');
  assert.match(before.title,/PRÉPRODUCTION ISOLÉE/);

  await preprod.evaluate(({people,t})=>{
   db.players=people;db.tournaments=[t];db.selected=null;save();
  },{people:fixturePlayers,t:fixture('PREPROD-BEFORE')});
  const settingsValidation=await showBackup(validation);
  const downloaded=validation.waitForEvent('download');
  await settingsValidation.locator('button').filter({hasText:'Exporter une sauvegarde'}).click();
  const exportFile=await downloaded;
  const data=JSON.parse(fs.readFileSync(await exportFile.path(),'utf8'));
  assert.equal(data.data.tournaments[0].id,'VALIDATION-KEEP');
  assert.deepEqual(data.data.tournaments[0].matches[0].sets,[{a:5,b:3}]);

  const dialogs=[];preprod.on('dialog',async d=>{dialogs.push(d.message());await d.accept()});
  const settingsPre=await showBackup(preprod);
  const fileChooser=preprod.waitForEvent('filechooser');
  await settingsPre.locator('button').filter({hasText:'Restaurer une sauvegarde JSON'}).click();
  const chooser=await fileChooser;
  await chooser.setFiles(await exportFile.path());
  await preprod.waitForFunction(()=>db.tournaments.some(t=>t.id==='VALIDATION-KEEP'),{timeout:15000});
  assert.equal(dialogs.length,3,'Trois confirmations attendues pour restauration');

  const after=await preprod.evaluate(({valid,pre,legacy})=>({
   tournaments:db.tournaments.map(t=>t.id),
   scores:db.tournaments[0]?.matches[0]?.score,
   sets:db.tournaments[0]?.matches[0]?.sets,
   valid:localStorage.getItem(valid),pre:localStorage.getItem(pre),
   legacy:localStorage.getItem(legacy)
  }),{valid:KEY_VALID,pre:KEY_PRE,legacy:legacyKey});
  assert.deepEqual(after.tournaments,['VALIDATION-KEEP']);
  assert.deepEqual(after.scores,{a:5,b:3});
  assert.deepEqual(after.sets,[{a:5,b:3}]);
  assert.equal(after.valid,first.stored,'La préproduction a écrasé la sauvegarde de validation');
  assert.equal(after.legacy,'DO-NOT-TOUCH','La préproduction a écrasé une ancienne clé');
  assert(JSON.parse(after.pre).tournaments.length===1,'La nouvelle clé n’a pas été écrite');
  const protectedArchives=await archives(preprod);
  assert(protectedArchives.some(a=>a.id.startsWith('protegee-avant-restauration-courante-')
     &&a.tournaments.includes('PREPROD-BEFORE')),
     'La préproduction n’a pas protégé ses propres données dans IndexedDB');

  await preprod.reload({waitUntil:'domcontentloaded'});
  const persisted=await preprod.evaluate(()=>({
   ids:db.tournaments.map(t=>t.id),sets:db.tournaments[0]?.matches[0]?.sets
  }));
  assert.deepEqual(persisted,{ids:['VALIDATION-KEEP'],sets:[{a:5,b:3}]});
  await validation.reload({waitUntil:'domcontentloaded'});
  const original=await validation.evaluate(({valid,pre})=>({
   id:db.tournaments[0]?.id,
   stored:localStorage.getItem(valid),
   pre:localStorage.getItem(pre)
  }),{valid:KEY_VALID,pre:KEY_PRE});
  assert.equal(original.id,'VALIDATION-KEEP');
  const persistedValidation=JSON.parse(original.stored);
  assert.deepEqual(persistedValidation.tournaments.map(t=>t.id),['VALIDATION-KEEP'],'Les tournois de validation ont changé au rechargement');
  assert.deepEqual(persistedValidation.tournaments[0].matches[0].score,{a:5,b:3},'Le score de validation a changé');
  assert.deepEqual(persistedValidation.tournaments[0].matches[0].sets,[{a:5,b:3}],'La manche de validation a changé');
  const persistedPreprod=JSON.parse(original.pre);
  assert.deepEqual(persistedPreprod.tournaments.map(t=>t.id),['VALIDATION-KEEP'],'Le tournoi préproduction a changé après rechargement');
  assert.deepEqual(persistedPreprod.tournaments[0].matches[0].score,{a:5,b:3},'Le score préproduction a changé');
  assert.deepEqual(persistedPreprod.tournaments[0].matches[0].sets,[{a:5,b:3}],'La manche préproduction a changé');
  assert.deepEqual(errors,[],'Erreurs JavaScript : '+errors.join(' ; '));
  console.log('OK préproduction : '+(engineName==='webkit'?'WebKit tactile 390x844':'Chrome desktop 1366x768')+', export/import par UI, 3 confirmations, IndexedDB, rechargement');
  console.log('OK isolation : clés validation, préproduction et historique conservées sous une même origine');
  console.log('LIMITE : tests automatisés non équivalents à Chrome Windows 11 ou Safari iPhone physiques');
 }finally{
  if(context)await context.close();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
