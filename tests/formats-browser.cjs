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
 // Après le rechargement précédent, l'annuaire MILFT de référence est réinjecté : isoler les participants fictifs.
 await page.evaluate(players=>{db.players=players;save();render();},players);
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

async function correctionStandings(page){
 const context=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster saison');
  if(!t)throw Error('Monster saisonnier fictif absent');
  const m=t.matches.find(x=>x.round===1&&x.status==='done');
  if(!m)throw Error('Résultat de séance fictif absent');
  db.selected=t.id;tab='live-detail';save();render();
  return {id:m.id,a:m.teamA[0],b:m.teamB[0],score:{...m.score},
   beforeA:monsterStats(t).find(x=>x.id===m.teamA[0]).pts,
   beforeB:monsterStats(t).find(x=>x.id===m.teamB[0]).pts};
 });
 assert.equal(context.beforeA,2,'Monster : gagnant initial non crédité');
 assert.equal(context.beforeB,0,'Monster : perdant initial crédité');
 await page.evaluate(id=>correctMonsterResult(id),context.id);
 assert.equal(await page.locator('#monster-corrections').count(),1,'Éditeur Monster absent');
 await page.evaluate(id=>cancelMonsterCorrection(id),context.id);
 const cancelled=await page.evaluate(id=>{
  const t=active(),m=t.matches.find(x=>x.id===id);
  return {score:m.score,correcting:!!m.correcting};
 },context.id);
 assert.deepEqual(cancelled.score,{a:8,b:6},'Monster : Annuler a modifié le résultat officiel');
 assert.equal(cancelled.correcting,false,'Monster : édition toujours ouverte après Annuler');
 await page.evaluate(id=>correctMonsterResult(id),context.id);
 await page.locator('[id="corr-win-'+context.id+'-0"]').selectOption('b');
 await page.evaluate(()=>{window.confirm=()=>true;});
 await page.locator('#monster-corrections button').filter({hasText:'Valider la correction'}).click();
 const changed=await page.evaluate(id=>{
  const t=active(),m=t.matches.find(x=>x.id===id);
  return {score:m.score,sets:m.sets,correcting:!!m.correcting,
   a:monsterStats(t).find(x=>x.id===m.teamA[0]),
   b:monsterStats(t).find(x=>x.id===m.teamB[0])};
 },context.id);
 assert.deepEqual(changed.score,{a:6,b:8},'Monster : inversion du score non enregistrée');
 assert.equal(changed.correcting,false,'Monster : correction non terminée');
 assert.equal(changed.a.pts,0,'Monster : anciens points conservés chez le perdant');
 assert.equal(changed.b.pts,2,'Monster : nouveaux points absents chez le gagnant');
 assert.equal(changed.a.diff,-2,'Monster : différence de buts non recalculée');
 assert.equal(changed.b.diff,2,'Monster : différence de buts adverse erronée');
 console.log('OK Chromium : correction Monster, Annuler intact, résultat inverse, classement recalculé');

 await page.evaluate(players=>{db.players=players;save();render();},players);
 await page.evaluate(()=>{setTab('new');selectCreationMode('challenge');});
 const form=page.locator('#annual-classic-form');
 await form.locator('input[name="name"]').fill('Championnat corrections test');
 await form.locator('input[name="participants"]').nth(0).check();
 await form.locator('input[name="participants"]').nth(1).check();
 await form.locator('button').last().click();
 const annual=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Championnat corrections test');
  if(!t)throw Error('Championnat annuel test non créé');
  const m=t.matches[0];
  m.status='done';m.table=null;
  m.sets=[{a:5,b:2},{a:5,b:3},{a:3,b:5},{a:5,b:4}];m.score={a:3,b:1};
  save();
  const ranking=challengeStandings(t);
  return {id:t.id,match:m.id,first:t.roster[0].first,second:t.roster[1].first,
   firstBeforeSecond:ranking.indexOf(t.roster[0].first)<ranking.indexOf(t.roster[1].first)};
 });
 assert(annual.firstBeforeSecond,'Championnat annuel : classement initial incorrect');
 const corrected=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id);
  const m=t.matches[0];const original=JSON.stringify({score:m.score,sets:m.sets});
  window.prompt=()=> 'erreur';
  window.confirm=()=>true;
  correctChallenge(m.id);
  const rejected=JSON.stringify({score:m.score,sets:m.sets})===original;
  const prompts=['3-5','5-3','3-5','5-3','3-5'];
  window.prompt=()=>prompts.shift();
  correctChallenge(m.id);
  const ranking=challengeStandings(t);
  return {rejected,score:m.score,sets:m.sets,status:m.status,
   winnerFirst:ranking.indexOf(t.roster[1].first)<ranking.indexOf(t.roster[0].first)};
 },annual.id);
 assert(corrected.rejected,'Championnat annuel : correction invalide a modifié les résultats');
 assert.deepEqual(corrected.score,{a:2,b:3},'Championnat annuel : résultat après correction erroné');
 assert.equal(corrected.sets.length,5,'Championnat annuel : cinq manches attendues');
 assert.equal(corrected.status,'done','Championnat annuel : rencontre terminée doit rester terminée');
 assert(corrected.winnerFirst,'Championnat annuel : classement non recalculé après inversion');
 await page.reload({waitUntil:'domcontentloaded'});
 const loaded=await page.evaluate(()=>{
  const m=db.tournaments.find(x=>x.name==='Championnat corrections test')?.matches[0];
  const season=db.tournaments.find(x=>x.name==='Test Monster saison');
  return {annualScore:m?.score,annualSets:m?.sets?.length,
   monsterScore:season?.matches.find(x=>x.round===1)?.score,
   untouchedSwiss:db.tournaments.some(x=>x.name==='Test Suisse')};
 });
 assert.deepEqual(loaded.annualScore,{a:2,b:3},'Rechargement : correction championnat perdue');
 assert.equal(loaded.annualSets,5,'Rechargement : manches du championnat perdues');
 assert.deepEqual(loaded.monsterScore,{a:6,b:8},'Rechargement : correction Monster perdue');
 assert(loaded.untouchedSwiss,'Correction scores : tournoi suisse indépendant disparu');
 console.log('OK Chromium : correction championnat annuel 3-1 vers 2-3, classement inversé et persistance');
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
  await correctionStandings(page);
  assert.deepEqual(errors,[],'Erreurs navigateur : '+errors.join('; '));
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});