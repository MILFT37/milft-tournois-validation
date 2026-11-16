/* MILFT V1.1 : autres formats, navigateur isolé avec huit joueurs entièrement fictifs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const KEY='milft_iso_20261102_tournois_v01';
const players=Array.from({length:8},(_,i)=>({id:'TEST-'+(i+1),first:'Test'+(i+1),last:'MILFT'}));
const initial={players,tournaments:[],selected:null};
async function serve(){
 const server=http.createServer((req,res)=>{
  let rel;
  try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||HTML;}catch{res.writeHead(400).end();return;}
  const target=path.resolve(process.cwd(),rel);
  if(!target.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':'.html'===path.extname(target)?'text/html; charset=utf-8':'application/octet-stream','Cache-Control':'no-store'}).end(data);
  });
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'+HTML};
}
async function creation(page,mode){
 await page.evaluate(mode=>{setTab('new');selectCreationMode(mode);},mode);
 if(mode==='poules')return page.locator('form[data-mode="poules"]');
 if(mode==='monster')return page.locator('form[onsubmit*="createMonster"]');
 throw Error('Mode inconnu : '+mode);
}
async function playersChecked(form,count){
 const inputs=form.locator('input[name="participants"]');
 assert.equal(await inputs.count(),players.length,'Tous les joueurs tests doivent être proposés');
 for(let i=0;i<count;i++)await inputs.nth(i).check();
}
async function submit(form){
 await form.locator('button').last().click();
}
const pairKey=(a,b)=>[a,b].sort().join('|');
async function swissAndDouble(page){
 let form=await creation(page,'poules');
 await form.locator('input[name="name"]').fill('Test Suisse');
 await form.locator('input[name="rounds"]').fill('2');
 await playersChecked(form,6);
 assert(await form.locator('input[name="swiss"]').isChecked(),'Suisse doit être activé par défaut');
 await submit(form);
 let first=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Suisse');
  if(!t)return null;
  return {id:t.id,mode:t.mode,swiss:t.swiss,round:t.currentRound,matchCount:t.matches.length,roster:t.roster.length};
 });
 assert(first&&first.mode==='poules'&&first.swiss&&first.round===1&&first.matchCount===3&&first.roster===6,
  'Création du premier tour Suisse : '+JSON.stringify(first));
 const second=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id);
  const before=t.matches.map(m=>[m.a,m.b].sort().join('|'));
  for(const m of t.matches){
   m.status='done';m.score={a:8,b:6};m.sets=[{a:8,b:6}];m.table=null;
  }
  window.confirm=()=>true;nextRound();
  return {round:t.currentRound,firstPairs:before,
   secondPairs:t.matches.filter(m=>m.round===2).map(m=>[m.a,m.b].sort().join('|')),
   statuses:t.matches.filter(m=>m.round===2).map(m=>m.status)};
 },first.id);
 assert.equal(second.round,2,'Tour 2 Suisse non généré');
 assert.equal(second.secondPairs.length,3,'Trois rencontres attendues au tour 2');
 assert(second.secondPairs.every(x=>!second.firstPairs.includes(x)),'Répétition évitable de confrontation Suisse');
 assert.equal(new Set(second.secondPairs).size,3,'Confrontations Suisse répétées');
 console.log('OK Chromium : Suisse 6 joueurs, tours 1 et 2 sans répétition');

 form=await creation(page,'poules');
 await form.locator('input[name="name"]').fill('Test Double fixe');
 await form.locator('select[name="discipline"]').selectOption('double');
 await playersChecked(form,4);
 const members=form.locator('select[name="fixedMember"]');
 assert.equal(await members.count(),4,'Quatre sélections de joueurs en double');
 for(let i=0;i<4;i++)await members.nth(i).selectOption(players[i].id);
 await submit(form);
 const result=await page.evaluate(()=>{
  const swiss=db.tournaments.find(x=>x.name==='Test Suisse');
  const t=db.tournaments.find(x=>x.name==='Test Double fixe');
  if(!t)return null;
  return {discipline:t.discipline,teams:t.roster.map(x=>x.members),
   matchCount:t.matches.length,swissStillHere:!!swiss&&swiss.currentRound===2,
   swissMatchCount:swiss?.matches.length};
 });
 assert(result&&result.discipline==='double'&&result.teams.length===2&&result.matchCount===1,
  'Création du Double fixe : '+JSON.stringify(result));
 assert.deepEqual(result.teams.flat().slice().sort(),players.slice(0,4).map(x=>x.id).sort(),
  'Joueur manquant / deux fois utilisé dans les équipes fixes');
 assert(result.swissStillHere&&result.swissMatchCount===6,'Le Double a altéré le tournoi Suisse');
 console.log('OK Chromium : Double fixe et indépendance du Suisse');
}
async function monsterAndSimulation(page){
 const form=await creation(page,'monster');
 await form.locator('input[name="name"]').fill('Test Monster');
 await form.locator('input[name="tables"]').fill('2');
 await form.locator('input[name="rounds"]').fill('2');
 await playersChecked(form,8);
 await submit(form);
 const initialRound=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster');
  if(!t)return null;
  return {id:t.id,mode:t.mode,monsterMode:t.monsterMode,round:t.currentRound,
   matches:t.matches.map(m=>({teamA:m.teamA,teamB:m.teamB,round:m.round})),roster:t.roster.length};
 });
 assert(initialRound&&initialRound.mode==='monster'&&initialRound.monsterMode==='mini'&&
  initialRound.round===1&&initialRound.roster===8&&initialRound.matches.length===2,'Premier tour Monster');
 assert.equal(new Set(initialRound.matches.flatMap(m=>[...m.teamA,...m.teamB])).size,8,
  'Un joueur joue deux rencontres Monster au premier tour');
 const second=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id);
  const firstPartners=t.matches.flatMap(m=>[m.teamA,m.teamB].map(pair=>pair.slice().sort().join('|')));
  for(const m of t.matches){m.status='done';m.score={a:8,b:6};m.sets=[{a:8,b:6}];m.table=null;}
  t.tables.forEach(table=>table.state='free');
  window.confirm=()=>true;
  nextMonsterRound();
  const next=t.matches.filter(m=>m.round===2);
  return {round:t.currentRound,firstPartners,secondPartners:next.flatMap(m=>[m.teamA,m.teamB].map(pair=>pair.slice().sort().join('|'))),
   secondPlayers:next.flatMap(m=>[...m.teamA,...m.teamB]),matchCount:t.matches.length};
 },initialRound.id);
 assert.equal(second.round,2,'Monster : tour 2 non généré');
 assert.equal(second.matchCount,4,'Monster : quatre matchs attendus sur deux tours');
 assert.equal(new Set(second.secondPlayers).size,8,'Monster : joueur en double sur un tour');
 assert.equal(second.secondPartners.length,4,'Monster : quatre binômes au deuxième tour');
 assert(second.secondPartners.every(x=>!second.firstPartners.includes(x)),
  'Monster : répétition de partenaires pourtant évitable à huit joueurs');
 console.log('OK Chromium : Monster DYP deux tours et renouvellement des partenaires');

 const projections=await page.evaluate(()=>{
  const saved=JSON.stringify(db);
  setTab('simulation');
  planAdd();planAdd();
  planUpdate(-1,'tables',4);
  const slow=planEstimate(false).finish;
  planUpdate(-1,'tables',8);
  const fast=planEstimate(false).finish;
  const events=plan.events.length;
  setTab('avancement');
  return {sameDb:JSON.stringify(db)===saved,events,slow,fast,
   progressRenders:document.getElementById('view')?.textContent?.includes('Suivi automatique des tournois')};
 });
 assert(projections.sameDb,'La simulation a modifié de vrais tournois (du navigateur fictif)');
 assert.equal(projections.events,2,'Les compétitions simultanées n’ont pas été enregistrées');
 assert(projections.fast<=projections.slow,'Plus de tables allongent anormalement la projection');
 assert(projections.progressRenders,'Le menu Avancement ne se rend pas');
 await page.reload({waitUntil:'domcontentloaded'});
 const persisted=await page.evaluate(()=>{
  return {tournaments:db.tournaments.length,hasSwiss:db.tournaments.some(x=>x.name==='Test Suisse'),
   hasMonster:db.tournaments.some(x=>x.name==='Test Monster'),
   hasDouble:db.tournaments.some(x=>x.name==='Test Double fixe'),
   events:plan.events.length};
 });
 assert.deepEqual(persisted,{tournaments:3,hasSwiss:true,hasMonster:true,hasDouble:true,events:2},
  'Perte de données après fermeture/réouverture dans Chromium');
 console.log('OK Chromium : Simulation/Avancement, projection 4→8 tables, trois tournois conservés');
}
async function oddAndSeason(page){
 let form=await creation(page,'poules');
 await form.locator('input[name="name"]').fill('Test Suisse impair');
 await form.locator('input[name="rounds"]').fill('2');
 await playersChecked(form,5);
 await submit(form);
 const oddSwiss=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Suisse impair');
  const r1=t.matches.filter(m=>m.round===1),bye1=r1.find(m=>m.bye)?.a;
  for(const m of r1.filter(m=>!m.bye)){m.status='done';m.score={a:8,b:6};m.sets=[{a:8,b:6}];m.table=null;}
  window.confirm=()=>true;nextRound();
  const r2=t.matches.filter(m=>m.round===2);
  return {bye1,bye2:r2.find(m=>m.bye)?.a,first:r1.length,second:r2.length,
   doneByes:t.matches.filter(m=>m.bye&&m.status==='done').length};
 });
 assert(oddSwiss.bye1&&oddSwiss.bye2&&oddSwiss.bye1!==oddSwiss.bye2,
  'Suisse impair : repos BYE non tournant : '+JSON.stringify(oddSwiss));
 assert.equal(oddSwiss.first,3,'Suisse impair : trois résultats dont un BYE attendus');
 assert.equal(oddSwiss.second,3,'Suisse impair : trois résultats dont un BYE au tour 2');
 assert.equal(oddSwiss.doneByes,2,'Suisse impair : BYE 5-3 non conservés');
 console.log('OK Chromium : Suisse impair, deux BYE attribués à deux joueurs différents');

 form=await creation(page,'monster');
 await form.locator('input[name="name"]').fill('Test Monster saison');
 await form.locator('select[name="seasonMode"]').selectOption('season');
 await playersChecked(form,5);
 await submit(form);
 const season=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster saison');
  if(!t)return {error:'creation absente'};
  window.confirm=()=>true;
  generateMonsterSession();
  const before=t.matches.length,round1=t.matches.filter(m=>m.round===1);
  const blockedBefore= t.currentRound;
  generateMonsterSession();
  const blocked=t.currentRound===blockedBefore&&t.matches.length===before;
  for(const m of round1){m.status='done';m.score={a:8,b:6};m.sets=[{a:8,b:6}];m.table=null;}
  t.tables.forEach(x=>x.state='free');
  generateMonsterSession();
  const r1=t.sessions.find(x=>x.round===1),r2=t.sessions.find(x=>x.round===2);
  return {id:t.id,blocked,round:t.currentRound,total:t.matches.length,
   rest1:r1?.rest||[],rest2:r2?.rest||[],firstScore:t.matches.find(x=>x.round===1)?.score,
   sessionLengths:t.sessions.map(s=>s.players.length),preservedSession:t.sessions.length};
 });
 assert(season.blocked&&season.round===2&&season.total===2&&season.preservedSession===2,
  'Monster saisonnier : blocage ou passage de séance incorrect : '+JSON.stringify(season));
 assert.equal(season.rest1.length,1,'Monster saisonnier : un repos attendu en séance 1');
 assert.equal(season.rest2.length,1,'Monster saisonnier : un repos attendu en séance 2');
 assert.notEqual(season.rest1[0],season.rest2[0],'Monster saisonnier : deux repos identiques malgré cinq joueurs');
 assert.deepEqual(season.sessionLengths,[4,4],'Monster saisonnier : quatre joueurs par séance');
 assert.deepEqual(season.firstScore,{a:8,b:6},'Monster saisonnier : résultat initial perdu');
 await page.reload({waitUntil:'domcontentloaded'});
 const snapshot=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster saison');
  return {sessions:t?.sessions?.length,round:t?.currentRound,score:t?.matches?.find(m=>m.round===1)?.score};
 });
 assert.equal(snapshot.sessions,2,'Séances saisonnières perdues au rechargement');
 assert.equal(snapshot.round,2,'Numéro de séance perdu');
 assert.deepEqual(snapshot.score,{a:8,b:6},'Score saisonnier perdu au rechargement');
 console.log('OK Chromium : Monster saisonnier cinq joueurs, rotation des repos et reprise');
}

async function main(){
 const {server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  await context.addInitScript({content:'if(!localStorage.getItem('+JSON.stringify(KEY)+'))localStorage.setItem('+
   JSON.stringify(KEY)+','+JSON.stringify(JSON.stringify(initial))+');'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  // L'application charge aussi un annuaire de référence. Le scénario isole explicitement ses joueurs fictifs.
  await page.evaluate(fixture=>{db.players=fixture.players;db.tournaments=[];db.selected=null;plan.events=[];plan.progress=[];planSave();save();render();},initial);
  await swissAndDouble(page);
  await monsterAndSimulation(page);
  await oddAndSeason(page);
  assert.deepEqual(errors,[],'Erreurs navigateur : '+errors.join('; '));
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});