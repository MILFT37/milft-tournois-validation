/* MILFT V1.1 — test UI export/import WebKit, profils fictifs isolés.
   Ce parcours ne remplace pas la validation de Safari sur un iPhone physique. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {webkit}=require('playwright');
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const ROOT=process.cwd();
async function serve(){
 const server=http.createServer((req,res)=>{
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}
  catch{res.writeHead(400).end();return;}
  const target=path.resolve(ROOT,name);
  if(!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const ext=path.extname(target);
   const type=ext==='.html'?'text/html; charset=utf-8':ext==='.json'||ext==='.webmanifest'?'application/json':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
  });
 });
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'};
}
async function showBackup(page){
 await page.locator('#milft-settings-toggle').click();
 const section=page.locator('#milft-settings details.settings-backup');
 await section.locator('summary').click();
 await section.locator('#milft-backup button').first().waitFor({state:'visible'});
 return section;
}
async function fixture(page,id){
 return page.evaluate(id=>{
  const people=[
   {id:'ui-one',first:'Alice',last:'TEST'},
   {id:'ui-two',first:'Bob',last:'TEST'}
  ];
  const t={id,name:'Recette '+id,mode:'poules',discipline:'single',date:'2026-11-16',
   closed:true,roster:people.map(p=>({...p})),roundLimit:1,currentRound:1,
   tables:[{id:1,state:'free'}],
   matches:[{id:id+'-match',a:'ui-one',b:'ui-two',round:1,status:'done',table:null,
    score:{a:8,b:6},sets:[{a:8,b:6}]}]};
  db.players=people;db.tournaments=[t];db.selected=id;
  plan={events:[],progress:[]};progressPrefs={};save();planSave();
  return {id:db.tournaments[0].id,score:db.tournaments[0].matches[0].score};
 },id);
}
async function archives(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('MILFT_ISO_20261102_SECOURS',1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains('archives'))request.result.createObjectStore('archives',{keyPath:'id'});
  };
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const connection=request.result;
   const tx=connection.transaction('archives','readonly');
   const op=tx.objectStore('archives').getAll();
   op.onerror=()=>reject(op.error);
   op.onsuccess=()=>{resolve(op.result.map(a=>({id:a.id,ids:a.payload?.data?.tournaments?.map(t=>t.id)||[]})));connection.close();};
  };
 }));
}
async function main(){
 const {server,url}=await serve();
 let browser;
 try{
  browser=await webkit.launch({headless:true});
  const options={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true};
  const original=await browser.newContext(options);
  const first=await original.newPage(), errors=[];
  first.on('pageerror',e=>errors.push('source: '+e.message));
  await first.goto(url,{waitUntil:'domcontentloaded'});
  await first.waitForURL(x=>x.pathname.endsWith('/'+HTML));
  await fixture(first,'UI-EXPORT-TEST');
  const backup=await showBackup(first);
  const downloadPromise=first.waitForEvent('download');
  await backup.locator('button').filter({hasText:'Exporter une sauvegarde'}).click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^MILFT-sauvegarde-.*\.json$/);
  const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(data.format,'MILFT-TOURNOIS-BACKUP');
  assert.equal(data.data.tournaments[0].id,'UI-EXPORT-TEST');
  assert.deepEqual(data.data.tournaments[0].matches[0].score,{a:8,b:6});
  console.log('OK WebKit UI : export JSON par le bouton de paramètres');

  const isolated=await browser.newContext(options);
  const second=await isolated.newPage();
  second.on('pageerror',e=>errors.push('destination: '+e.message));
  const dialogs=[];
  second.on('dialog',async d=>{dialogs.push({type:d.type(),text:d.message()});await d.accept();});
  await second.goto(url,{waitUntil:'domcontentloaded'});
  await fixture(second,'UI-AVANT-IMPORT');
  const section=await showBackup(second);
  const fileChooserPromise=second.waitForEvent('filechooser');
  await section.locator('button').filter({hasText:'Restaurer une sauvegarde JSON'}).click();
  const fileChooser=await fileChooserPromise;
  await fileChooser.setFiles({name:'MILFT-ui-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await second.waitForFunction(()=>db.tournaments[0]?.id==='UI-EXPORT-TEST',{timeout:15000});
  assert.equal(dialogs.filter(x=>x.type==='confirm').length,3,'Import UI : trois confirmations attendues');
  const stored=await second.evaluate(()=>({
   id:db.tournaments[0]?.id,score:db.tournaments[0]?.matches[0]?.score,
   selected:db.selected,raw:localStorage.getItem('milft_iso_20261102_tournois_v01')
  }));
  assert.equal(stored.id,'UI-EXPORT-TEST');
  assert.equal(stored.selected,'UI-EXPORT-TEST');
  assert.deepEqual(stored.score,{a:8,b:6});
  assert(!!stored.raw,'Restauration absente du stockage');
  const protectedCopies=await archives(second);
  assert(protectedCopies.some(x=>x.id.startsWith('protegee-avant-restauration-courante-')&&x.ids.includes('UI-AVANT-IMPORT')),
   'Les anciennes données du profil fictif ne sont pas protégées dans IndexedDB');
  await second.reload({waitUntil:'domcontentloaded'});
  const reload=await second.evaluate(()=>({id:db.tournaments[0]?.id,score:db.tournaments[0]?.matches?.[0]?.score}));
  assert.deepEqual(reload,{id:'UI-EXPORT-TEST',score:{a:8,b:6}},
   'WebKit UI : résultat perdu après rechargement');
  console.log('OK WebKit UI : import via bouton et filechooser, trois confirmations, protection IndexedDB, reprise');

  /* Rejeter un JSON invalide AVANT toute confirmation ou modification locale. */
  const beforeInvalid=await second.evaluate(()=>localStorage.getItem('milft_iso_20261102_tournois_v01'));
  const dialogCount=dialogs.length;
  const reopened=await showBackup(second);
  const invalidChooserPromise=second.waitForEvent('filechooser');
  await reopened.locator('button').filter({hasText:'Restaurer une sauvegarde JSON'}).click();
  const invalidChooser=await invalidChooserPromise;
  await invalidChooser.setFiles({name:'invalide.json',mimeType:'application/json',buffer:Buffer.from('{"format":"INVALID"}')});
  await second.waitForFunction(()=>document.getElementById('milft-backup-file')?.value==='',{timeout:15000});
  await second.waitForTimeout(120);
  assert(dialogs.slice(dialogCount).some(x=>x.type==='alert'),'Fichier invalide non signalé');
  assert(!dialogs.slice(dialogCount).some(x=>x.type==='confirm'),'Fichier invalide a déclenché les confirmations');
  const afterInvalid=await second.evaluate(()=>localStorage.getItem('milft_iso_20261102_tournois_v01'));
  assert.equal(afterInvalid,beforeInvalid,'Fichier invalide a modifié les données du profil fictif');
  assert.deepEqual(errors,[],'Erreurs JS WebKit UI : '+errors.join('; '));
  console.log('OK WebKit UI : JSON invalide rejeté sans réécriture des données');
  await isolated.close();
  await original.close();
  console.log('LIMITE : WebKit automatisé ne prouve pas le sélecteur de fichiers Safari iOS physique');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
