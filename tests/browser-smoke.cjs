/* Recette Chromium isolée : aucune donnée réelle et aucun déploiement. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

const ROOT=process.cwd();
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const KEY='milft_iso_20261102_tournois_v01';
const clone=obj=>JSON.parse(JSON.stringify(obj));
const players=['P1','P2','P3','P4'].map((id,i)=>({id,first:'Joueur'+(i+1),last:'TEST'}));
const roster=players.map(p=>({...p}));
const match=(id,a,b)=>({id,a,b,round:1,status:'done',score:{a:5,b:3},sets:[{a:5,b:3}]});
const table=(id=1)=>({id,state:'free',milftBracketPreference:'auto'});
const root={
 id:'root',mode:'poules',discipline:'single',name:'Tournoi MILFT',
 date:'2026-11-07',created:1794052800000,closed:true,finalPhase:true,finalId:'A',finalBId:'B',
 currentRound:1,roundLimit:1,roster, matches:[match('P-M1','P1','P2')],tables:[table()]
};
const A={
 id:'A',sourceId:'root',mode:'knockout',bracketLetter:'A',discipline:'single',
 name:'Tournoi MILFT — Tableau A',date:'2026-11-07',created:1794052800000,closed:true,
 roster,matches:[match('A-M1','P1','P2')],tables:[table()]
};
const B={
 id:'B',sourceId:'root',mode:'knockout',bracketLetter:'B',discipline:'single',
 name:'Tournoi MILFT — Tableau B',date:'2026-11-07',created:1794052800000,closed:true,
 roster,matches:[match('B-M1','P3','P4')],tables:[table()]
};
const solo={
 id:'solo',mode:'monster',monsterMode:'season',discipline:'single',name:'Tournoi indépendant',
 date:'2026-11-14',created:1794661200000,closed:false,roster,
 matches:[{id:'S-M1',a:'P1',b:'P2',round:1,status:'waiting',sets:[]}],tables:[table()]
};
const fixture={players,tournaments:[root,A,B,solo],selected:'solo'};

async function serveLocal(){
 const server=http.createServer((req,res)=>{
  let rel;
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   rel=pathname==='/'?HTML:pathname.slice(1);
  }catch{res.writeHead(400).end();return;}
  const target=path.resolve(ROOT,rel);
  if(!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const ext=path.extname(target).toLowerCase();
   const type=ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'application/javascript':
    ext==='.json'||ext==='.webmanifest'?'application/json':ext==='.png'?'image/png':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'+HTML};
}
async function goHistory(page){
 await page.locator('#tabs button').filter({hasText:'Historique'}).click();
 await page.waitForSelector('#history-results .milft-history-entry');
}
async function checkPage(browser,url,width,height,label){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
 const init='if(!localStorage.getItem('+JSON.stringify(KEY)+'))localStorage.setItem('+JSON.stringify(KEY)+','+JSON.stringify(JSON.stringify(fixture))+');';
 await context.addInitScript({content:init});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await goHistory(page);
  const first=await page.locator('#history-results .milft-history-entry').count();
  assert.equal(first,2,label+': quatre phases au lieu de deux événements');
  const count=await page.locator('#history-count').innerText();
  assert.match(count,/2 événements sur 2/,label+': mauvais compteur');
  const eventRow=page.locator('#history-results .milft-history-entry').filter({hasText:'Tournoi MILFT'});
  assert.equal(await eventRow.count(),1,label+': événement regroupé non unique');
  assert.match(await eventRow.innerText(),/Poules \/ Tableau A \/ Tableau B/,label+': phases absentes');
  assert.match(await eventRow.innerText(),/3\/3 matchs/,label+': total des rencontres erroné');
  const buttonResult=await page.evaluate(()=>{
   return [...document.querySelectorAll('#history-results .milft-history-actions button')].map(button=>{
    const rect=button.getBoundingClientRect(),style=getComputedStyle(button);
    return {text:button.textContent.trim(),nowrap:style.whiteSpace==='nowrap',
     noOverflow:button.scrollWidth<=button.clientWidth+1,
     withinViewport:rect.left>=-1&&rect.right<=innerWidth+1,
     height:Math.round(rect.height)};
   });
  });
  assert.equal(buttonResult.length,4,label+': quatre commandes attendues');
  assert.equal(buttonResult.filter(x=>x.text==='Supprimer').length,2,label+': boutons Supprimer absents');
  for(const btn of buttonResult){
   assert(btn.nowrap&&btn.noOverflow&&btn.withinViewport&&btn.height>=40,
    label+': texte de bouton coupé ou débordant : '+JSON.stringify(btn));
  }
  await page.selectOption('#history-status','finished');
  assert.match(await page.locator('#history-count').innerText(),/1 événement sur 2/,label+': filtre Terminés');
  await page.selectOption('#history-status','active');
  assert.match(await page.locator('#history-count').innerText(),/1 événement sur 2/,label+': filtre En cours');
  await page.selectOption('#history-status','');
  fs.mkdirSync(path.join(ROOT,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(ROOT,'test-results','historique-'+label+'.png'),fullPage:true});
  // Suppression simulée dans un stockage temporaire créé pour ce test uniquement.
  await page.evaluate(()=>{
   window.confirm=()=>true;window.prompt=()=> 'SUPPRIMER';
   deleteTournament('A');
  });
  const remaining=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).tournaments.map(x=>x.id),KEY);
  assert.deepEqual(remaining,['solo'],label+': phase orpheline ou tournoi indépendant supprimé');
  await page.reload({waitUntil:'domcontentloaded'});
  await goHistory(page);
  assert.match(await page.locator('#history-count').innerText(),/1 événement sur 1/,label+': suppression non persistée');
  assert.deepEqual(errors,[],label+': erreur JavaScript dans le navigateur');
  console.log('OK navigateur '+label+' ('+width+'px) : historique, filtres, boutons, suppression et recharge');
 }finally{await context.close();}
}
async function checkLiveReload(browser,url){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
 const fixtureLive=clone(fixture);
 fixtureLive.tournaments=fixtureLive.tournaments.map(x=>clone(x));
 fixtureLive.tournaments=fixtureLive.tournaments.filter(x=>x.id!=='solo');
 const pools=fixtureLive.tournaments.find(x=>x.id==='root');
 const phaseA=fixtureLive.tournaments.find(x=>x.id==='A');
 const phaseB=fixtureLive.tournaments.find(x=>x.id==='B');
 pools.closed=true;phaseA.closed=false;phaseB.closed=false;
 phaseA.matches[0]={id:'A-LIVE',a:'P1',b:'P2',status:'playing',round:1,
  startedAt:123456,elapsedMs:9000,table:1,sets:[{a:5,b:3}],milftLaunchedPriority:true};
 phaseB.matches=[{id:'B-WAIT',a:'P3',b:'P4',status:'waiting',round:1,sets:[]}];
 for(const phase of [pools,phaseA,phaseB]){
  phase.tables=[{id:1,state:'playing'},{id:2,state:'free'}];
 }
 fixtureLive.selected='B';
 await context.addInitScript({content:'if(!localStorage.getItem('+JSON.stringify(KEY)+'))localStorage.setItem('+
  JSON.stringify(KEY)+','+JSON.stringify(JSON.stringify(fixtureLive))+');'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const previous=await page.evaluate(()=>{
   const b=db.tournaments.find(x=>x.id==='B');
   const free=milftFreeTables(b).map(x=>x.id);
   autoAssign(b);save();
   const a=db.tournaments.find(x=>x.id==='A');
   return {free,aStatus:a.matches[0].status,aSets:a.matches[0].sets,
    aTable:a.matches[0].table,bStatus:b.matches[0].status,bTable:b.matches[0].table};
  });
  assert.deepEqual(previous.free,[2],'La table 1 de A est encore proposée à B');
  assert.equal(previous.aStatus,'playing','A a été interrompu à tort');
  assert.equal(previous.aSets[0].a,5,'Manche du tableau A altérée');
  assert.equal(previous.bStatus,'playing','B non attribué à la table disponible');
  assert.equal(previous.bTable,2,'B attribué sur la table occupée');
  await page.reload({waitUntil:'domcontentloaded'});
  const restored=await page.evaluate(key=>{
   const saved=JSON.parse(localStorage.getItem(key));
   const a=saved.tournaments.find(x=>x.id==='A'),b=saved.tournaments.find(x=>x.id==='B');
   return {aStatus:a.matches[0].status,aSets:a.matches[0].sets,bStatus:b.matches[0].status,
    bTable:b.matches[0].table,actualDbMatches:db.tournaments.find(x=>x.id==='B').matches.length};
  },KEY);
  assert.equal(restored.aStatus,'playing','A perdu après rechargement');
  assert.equal(restored.aSets[0].b,3,'Manche A perdue après rechargement');
  assert.equal(restored.bStatus,'playing','B perdu après rechargement');
  assert.equal(restored.bTable,2,'Table B perdue après rechargement');
  assert.equal(restored.actualDbMatches,1,'La base chargée ne retrouve pas la rencontre B');
  assert.deepEqual(errors,[],'Erreurs JavaScript en rechargement A/B');
  console.log('OK navigateur mobile : attribution inter-phases, conservation manches et recharge');
 }finally{await context.close();}
}

async function main(){
 const {server,url}=await serveLocal();let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const [width,height,label] of [[360,800,'mobile-360'],[390,844,'mobile-390'],[1280,800,'pc-1280']]){
   await checkPage(browser,url,width,height,label);
  }
  await checkLiveReload(browser,url);
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});