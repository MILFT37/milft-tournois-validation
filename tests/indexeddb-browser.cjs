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

/* Un événement fictif avec poules + A/B, forfait, score corrigé et table occupée
   doit survivre à un VRAI export JSON, une restauration et un rechargement. */
async function checkLinkedABBackupRoundTrip(page){
 const initial=await page.evaluate(()=>{
  const players=Array.from({length:8},(_,i)=>({id:'ROUND-'+(i+1),first:'Test'+(i+1),last:'Sauvegarde'}));
  const roster=players.map(p=>({...p})),baseTable=()=>[{id:1,state:'playing'}];
  const phase=(id,letter,members)=>({
   id,sourceId:'ROOT-AB-BACKUP',mode:'knockout',bracketLetter:letter,discipline:'single',
   name:'Test sauvegarde A/B — Tableau '+letter,date:'2026-11-16',created:Date.now(),
   closed:false,abandoned:false,rounds:2,bronze:false,
   roster:members.map(i=>({...players[i]})),matches:[],tables:baseTable()
  });
  const root={id:'ROOT-AB-BACKUP',mode:'poules',discipline:'single',name:'Test sauvegarde A/B',
   date:'2026-11-16',created:Date.now(),closed:true,abandoned:false,finalPhase:true,
   finalId:'PHASE-A-BACKUP',finalBId:'PHASE-B-BACKUP',currentRound:2,roundLimit:2,
   qualifiers:4,qualifiersB:4,roster,targets:[],tables:baseTable(),
   matches:[{id:'POOL-ONE',a:players[0].id,b:players[4].id,round:1,status:'done',
    table:null,score:{a:8,b:6},sets:[{a:8,b:6}]}]};
  const A=phase('PHASE-A-BACKUP','A',[0,1,2,3]);
  A.matches=[
   {id:'A-LIVE-BACKUP',a:players[0].id,b:players[1].id,round:0,slot:0,
    status:'playing',table:1,startedAt:Date.now()-1000,elapsedMs:1500,
    score:null,sets:[{a:5,b:3}]},
   {id:'A-WAIT-BACKUP',a:players[2].id,b:players[3].id,round:0,slot:1,
    status:'waiting',table:null,score:null,sets:[]}
  ];
  const B=phase('PHASE-B-BACKUP','B',[4,5,6,7]);
  B.matches=[
   {id:'B-FORFAIT-BACKUP',a:players[4].id,b:players[5].id,round:0,slot:0,
    status:'done',table:null,forfait:true,forfaitWinner:'a',bye:false,score:{a:5,b:3},sets:[]},
   {id:'B-CORRECT-BACKUP',a:players[6].id,b:players[7].id,round:0,slot:1,
    status:'done',table:null,score:{a:0,b:3},
    sets:[{a:3,b:5},{a:4,b:5},{a:2,b:5}]}
  ];
  db={players,tournaments:[root,A,B],selected:A.id};
  plan={events:[],progress:[]};progressPrefs={backupTest:'linkedAB'};
  save();planSave();
  return {tournamentCount:db.tournaments.length,forfaitScore:B.matches[0].score,
   correctedScore:B.matches[1].score,activeTable:A.matches[0].table};
 });
 assert.equal(initial.tournamentCount,3,'Backup A/B : donnees fictives incompletes');
 const downloadPromise=page.waitForEvent('download');
 await page.evaluate(()=>milftExportBackup());
 const download=await downloadPromise;
 assert(/MILFT-sauvegarde-.+\.json$/.test(download.suggestedFilename()),'Nom du JSON exporté inattendu');
 const downloadPath=await download.path();
 const payload=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
 assert.equal(payload.format,'MILFT-TOURNOIS-BACKUP','Backup A/B : format export invalide');
 assert.equal(payload.version,1,'Backup A/B : version inattendue');
 assert.deepEqual(payload.data.tournaments.map(t=>t.id),
  ['ROOT-AB-BACKUP','PHASE-A-BACKUP','PHASE-B-BACKUP'],
  'Backup A/B : phases absentes du JSON exporté');
 assert.deepEqual(payload.data.tournaments[2].matches[0].score,{a:5,b:3},
  'Backup A/B : forfait modifié dans le JSON');
 assert.deepEqual(payload.data.tournaments[2].matches[1].score,{a:0,b:3},
  'Backup A/B : résultat corrigé modifié dans le JSON');
 const result=await page.evaluate(async payload=>{
  const alerts=[],confirmations=[];
  window.alert=s=>alerts.push(String(s));
  window.confirm=s=>{confirmations.push(String(s));return true;};
  const file=obj=>new File([JSON.stringify(obj)],'MILFT-RESTAURATION-AB-FICTIVE.json',{type:'application/json'});
  const fakePlayer={id:'TEMP',first:'Etat',last:'Avant'};
  db.players=[fakePlayer];db.tournaments=[
   {id:'BEFORE-RESTORE',mode:'poules',name:'Avant restauration',roster:[fakePlayer],
    tables:[{id:1,state:'free'}],matches:[],closed:false}
  ];db.selected='BEFORE-RESTORE';save();
  const previousRaw=localStorage.getItem('milft_iso_20261102_tournois_v01');
  await milftImportBackup({files:[file(payload)],value:'selected'});
  const restored=JSON.parse(localStorage.getItem('milft_iso_20261102_tournois_v01'));
  const A=restored.tournaments.find(t=>t.id==='PHASE-A-BACKUP'),
   B=restored.tournaments.find(t=>t.id==='PHASE-B-BACKUP'),
   root=restored.tournaments.find(t=>t.id==='ROOT-AB-BACKUP');
  const afterValid={alerts:alerts.slice(),confirmations:confirmations.length,
   count:restored.tournaments.length,selected:restored.selected,
   links:root?.finalId===A?.id&&root?.finalBId===B?.id&&A?.sourceId===root?.id&&B?.sourceId===root?.id,
   playing:A?.matches?.[0]?.status,table:A?.matches?.[0]?.table,
   tableStates:[root?.tables[0].state,A?.tables[0].state,B?.tables[0].state],
   forfeited:B?.matches?.[0]?.forfait,forfeitScore:B?.matches?.[0]?.score,
   correctedScore:B?.matches?.[1]?.score,
   correctedSets:B?.matches?.[1]?.sets,
   savedPlan:localStorage.getItem('milft_iso_20261102_plan')};
  const beforeInvalid=localStorage.getItem('milft_iso_20261102_tournois_v01');
  const invalid=JSON.parse(JSON.stringify(payload));
  invalid.data.tournaments[1].matches[0].table=99;
  const confirmationCount=confirmations.length;
  await milftImportBackup({files:[file(invalid)],value:'selected'});
  return {beforeRestore:JSON.parse(previousRaw).tournaments[0].id,afterValid,
   invalidNoWrite:localStorage.getItem('milft_iso_20261102_tournois_v01')===beforeInvalid,
   invalidBlockedEarly:confirmations.length===confirmationCount,
   invalidAlert:alerts.at(-1)||''};
 },payload);
 assert.equal(result.beforeRestore,'BEFORE-RESTORE','Backup A/B : comparaison avant import incorrecte');
 assert.deepEqual(result.afterValid.alerts,[],'Backup A/B : restauration rejetée : '+JSON.stringify(result.afterValid));
 assert.equal(result.afterValid.confirmations,3,'Backup A/B : confirmations de sécurité incorrectes');
 assert.equal(result.afterValid.count,3,'Backup A/B : tournoi perdu après import');
 assert.equal(result.afterValid.selected,'PHASE-A-BACKUP','Backup A/B : sélection perdue');
 assert(result.afterValid.links,'Backup A/B : liens entre phases perdus');
 assert.equal(result.afterValid.playing,'playing','Backup A/B : rencontre en cours perdue');
 assert.equal(result.afterValid.table,1,'Backup A/B : affectation de table perdue');
 assert.deepEqual(result.afterValid.tableStates,['playing','playing','playing'],
  'Backup A/B : état de table commun non restauré');
 assert.equal(result.afterValid.forfeited,true,'Backup A/B : indicateur forfait perdu');
 assert.deepEqual(result.afterValid.forfeitScore,{a:5,b:3},'Backup A/B : score forfait perdu');
 assert.deepEqual(result.afterValid.correctedScore,{a:0,b:3},'Backup A/B : score corrigé perdu');
 assert.equal(result.afterValid.correctedSets.length,3,'Backup A/B : manches corrigées perdues');
 assert(result.invalidNoWrite&&result.invalidBlockedEarly,
  'Backup A/B : une archive incohérente a modifié des données');
 assert(result.invalidAlert.includes('Rencontre en cours sans table valide'),
  'Backup A/B : diagnostic erroné pour table inexistante : '+result.invalidAlert);
 await page.reload({waitUntil:'domcontentloaded'});
 const recovered=await page.evaluate(()=>{
  const root=db.tournaments.find(t=>t.id==='ROOT-AB-BACKUP'),
   A=db.tournaments.find(t=>t.id==='PHASE-A-BACKUP'),
   B=db.tournaments.find(t=>t.id==='PHASE-B-BACKUP');
  return {count:db.tournaments.length,selected:db.selected,
   links:root?.finalId===A?.id&&root?.finalBId===B?.id,
   playing:A?.matches?.[0]?.status,table:A?.matches?.[0]?.table,
   forfeit:B?.matches?.[0]?.score,corrected:B?.matches?.[1]?.score};
 });
 assert.deepEqual(recovered,{count:3,selected:'PHASE-A-BACKUP',links:true,
  playing:'playing',table:1,forfeit:{a:5,b:3},corrected:{a:0,b:3}},
  'Backup A/B : perte de données après rechargement');
 console.log('OK Chromium : export réel JSON et import A/B liés, forfait, correction, table partagée, rejet et reprise');
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
  await checkLinkedABBackupRoundTrip(page);
  assert.deepEqual(errors,[],'Erreurs Javascript dans le navigateur');
  console.log('OK Chromium IndexedDB : session locale et archive récupérable protégées, import valide, refus incohérent et reprise');
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});