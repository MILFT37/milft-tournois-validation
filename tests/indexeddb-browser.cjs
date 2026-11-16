const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const KEY='milft_iso_20261102_tournois_v01';
async function serve(){
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||HTML;
  const filename=path.resolve(process.cwd(),name);
  if(!filename.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'}).end(data);
  });
 });
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'+HTML};
}
async function main(){
 const {server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const alerts=[],prompts=[];
   window.alert=s=>alerts.push(s);
   window.confirm=s=>{prompts.push(s);return true;};
   const people=[{id:'A',first:'Test',last:'A'},{id:'B',first:'Test',last:'B'}];
   const tournament=id=>({id,name:'Fictif '+id,mode:'poules',date:'2026-11-16',
    roster:people.map(p=>({...p})),tables:[{id:1,state:'free'}],matches:[
     {id:id+'-m1',a:'A',b:'B',status:'done',round:1,table:null,score:{a:8,b:6},sets:[{a:8,b:6}]}
    ],roundLimit:1,currentRound:1,target:8,bestOf:1,draw:false,closed:true});
   const payload=id=>({format:'MILFT-TOURNOIS-BACKUP',version:1,
    data:{players:people,tournaments:[tournament(id)],selected:id},
    planning:{events:[],progress:[]},progressPreferences:{}});
   db.players=people;db.tournaments=[tournament('CURRENT')];db.selected='CURRENT';save();
   const connection=await new Promise((ok,bad)=>{
    const req=indexedDB.open('MILFT_ISO_20261102_SECOURS',1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('archives'))
     req.result.createObjectStore('archives',{keyPath:'id'});};
    req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);
   });
   const transaction=(mode,action)=>new Promise((ok,bad)=>{
    const tx=connection.transaction('archives',mode);
    const req=action(tx.objectStore('archives'));
    let value;
    req.onsuccess=()=>{value=req.result;};
    tx.oncomplete=()=>ok(value);tx.onerror=()=>bad(tx.error);tx.onabort=()=>bad(tx.error);
   });
   await transaction('readwrite',s=>s.put({id:'auto-fictif',createdAt:Date.now()-60000,payload:payload('OLDER')}));
   const file=p=>new File([JSON.stringify(p)],'MILFT_IMPORT_TEST.json',{type:'application/json'});
   await milftImportBackup({files:[file(payload('IMPORTED'))],value:'fictif'});
   const archives=await transaction('readonly',s=>s.getAll());
   const current=archives.find(x=>x.id.startsWith('protegee-avant-restauration-courante-'));
   const older=archives.find(x=>x.id.startsWith('protegee-avant-restauration-recuperable-'));
   const raw=localStorage.getItem('milft_iso_20261102_tournois_v01');
   const promptsBefore=prompts.length;
   const invalid=payload('INVALID');
   invalid.data.tournaments[0].tables[0].state='playing';
   await milftImportBackup({files:[file(invalid)],value:'fictif'});
   const after=await transaction('readonly',s=>s.getAll());
   connection.close();
   return {alerts,prompts:prompts.length,promptsBefore,
    currentArchive:current?.payload?.data?.tournaments?.[0]?.id,
    olderArchive:older?.payload?.data?.tournaments?.[0]?.id,
    restored:db.tournaments[0]?.id,stored:JSON.parse(raw).tournaments[0]?.id,
    invalidUnchanged:localStorage.getItem('milft_iso_20261102_tournois_v01')===raw,
    noNewArchive:after.length===archives.length};
  });
  assert.equal(result.prompts,3,'La restauration valide exige trois confirmations');
  assert.equal(result.promptsBefore,3,'Import invalide non rejeté avant les confirmations');
  assert.equal(result.currentArchive,'CURRENT','IndexedDB : ancienne session locale non protégée');
  assert.equal(result.olderArchive,'OLDER','IndexedDB : ancienne archive récupérable non protégée');
  assert.equal(result.restored,'IMPORTED','Tournoi importé absent');
  assert.equal(result.stored,'IMPORTED','localStorage : données restaurées absentes');
  assert(result.invalidUnchanged&&result.noNewArchive,'Fichier invalide a modifié le stockage');
  assert(result.alerts.some(s=>s.includes('Table indiquée occupée')),'Fichier incohérent non refusé');
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(()=>({
   id:db.tournaments.find(t=>t.id==='IMPORTED')?.id,
   score:db.tournaments.find(t=>t.id==='IMPORTED')?.matches?.[0]?.score
  }));
  assert.equal(persisted.id,'IMPORTED','Restauration perdue après réouverture');
  assert.deepEqual(persisted.score,{a:8,b:6},'Résultat perdu après réouverture');
  assert.deepEqual(errors,[],'Erreurs Javascript dans le navigateur');
  console.log('OK Chromium IndexedDB : session locale et archive récupérable protégées, import valide, refus incohérent et reprise');
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});