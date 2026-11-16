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


/* Recette isolée : cinq joueurs, cinq tours mini, chacun doit se reposer exactement une fois. */
async function monsterMiniOddRotation(page){
 await page.evaluate(fixture=>{db.players=fixture;save();render();},players);
 const form=await creation(page,'monster');
 await form.locator('input[name="name"]').fill('Test Monster mini impair');
 await form.locator('input[name="rounds"]').fill('5');
 await playersChecked(form,5);
 await submit(form);
 const outcome=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster mini impair');
  if(!t)return {error:'Tournoi mini impair introuvable'};
  window.confirm=()=>true;
  const rounds=[];
  for(let n=1;n<=5;n++){
   if(n>1)nextMonsterRound();
   const matches=t.matches.filter(m=>m.round===n);
   const ids=matches.flatMap(m=>[...m.teamA,...m.teamB]);
   const rest=t.miniRests?.find(x=>x.round===n)?.players||[];
   rounds.push({round:t.currentRound,matchCount:matches.length,players:ids,rest});
   for(const m of matches){
    m.status='done';m.score={a:8,b:6};m.sets=[{a:8,b:6}];m.table=null;
   }
   t.tables.forEach(table=>table.state='free');
  }
  save();
  const before={round:t.currentRound,matches:t.matches.length};
  nextMonsterRound();
  const limitBlocked=t.currentRound===before.round&&t.matches.length===before.matches;
  return {id:t.id,rounds,limitBlocked,limit:t.roundLimit,matches:t.matches.length,
   allPlayed:t.matches.every(m=>m.status==='done')};
 });
 assert(!outcome.error,'Monster mini impair : '+JSON.stringify(outcome));
 assert.equal(outcome.limit,5,'Monster mini : limite des cinq tours non conservée');
 assert.equal(outcome.rounds.length,5,'Monster mini : cinq tours non générés');
 assert.equal(outcome.matches,5,'Monster mini impair : cinq rencontres attendues');
 assert(outcome.limitBlocked,'Monster mini : un sixième tour a été généré malgré la limite');
 assert(outcome.allPlayed,'Monster mini : un score de test non conservé');
 const rests=[];
 for(let n=0;n<outcome.rounds.length;n++){
  const r=outcome.rounds[n];
  assert.equal(r.round,n+1,'Monster mini : mauvais numéro de tour');
  assert.equal(r.matchCount,1,'Monster mini : une seule table de quatre joueurs attendue');
  assert.equal(r.players.length,4,'Monster mini : quatre joueurs actifs par tour');
  assert.equal(new Set(r.players).size,4,'Monster mini : joueur en double dans un tour');
  assert.equal(r.rest.length,1,'Monster mini : exactement un joueur au repos par tour');
  assert(!r.players.includes(r.rest[0]),'Monster mini : joueur simultanément actif et au repos');
  rests.push(r.rest[0]);
 }
 assert.equal(new Set(rests).size,5,'Monster mini : repos inégaux sur cinq tours, un joueur répété');
 await page.reload({waitUntil:'domcontentloaded'});
 const persisted=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Monster mini impair');
  return {round:t?.currentRound,restCount:t?.miniRests?.length,
   done:t?.matches?.filter(m=>m.status==='done').length,
   firstScore:t?.matches?.[0]?.score,
   swissPreserved:db.tournaments.some(x=>x.name==='Test Suisse')};
 });
 assert.equal(persisted.round,5,'Monster mini : numéro de tour perdu au rechargement');
 assert.equal(persisted.restCount,5,'Monster mini : historique des repos perdu');
 assert.equal(persisted.done,5,'Monster mini : résultats perdus');
 assert.deepEqual(persisted.firstScore,{a:8,b:6},'Monster mini : premier score perdu');
 assert(persisted.swissPreserved,'Monster mini : tournoi Suisse indépendant absent après recharge');
 console.log('OK Chromium : Monster mini impair, cinq repos tournants, limite et persistance');
}


/* Course aux points interclubs : verification des transitions de phases et des classements.
   Les relais finis ci-dessous sont injectes dans l'unique navigateur de demonstration pour
   isoler les transitions (ce n'est pas une simulation de saisie des compositions nominatives). */
async function capCompetitionCupFlow(page){
 await page.evaluate(()=>{setTab('new');selectCreationMode('cap');});
 let form=page.locator('form[onsubmit="capCompCreate(event)"]');
 assert.equal(await form.count(),1,'Formulaire Course aux points interclubs absent');
 await form.locator('[name="name"]').fill('Test Coupe interclubs');
 await form.locator('[name="structure"]').selectOption('cup');
 await form.locator('[name="clubs"]').fill('Club Alpha\nClub Beta\nClub Gamma\nClub Delta');
 await form.locator('[name="groupCount"]').fill('2');
 await form.locator('[name="qualifiers"]').fill('1');
 await form.locator('[name="targets"]').fill('5,10');
 await form.locator('[name="types"]').fill('S,D');
 await form.locator('[name="minPlayers"]').fill('2');
 await form.locator('[name="maxPlayers"]').fill('4');
 await form.locator('button').last().click();
 const created=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Coupe interclubs');
  if(!t)return null;
  const c=t.cap;
  window.__capTestAlerts=[];
  window.alert=msg=>window.__capTestAlerts.push(String(msg));
  capCompClose();
  return {id:t.id,mode:t.mode,competition:c.competition,phase:c.phase,
   groups:c.matches.filter(m=>m.phase==='groups').length,pools:c.pools.length,
   min:c.minPlayers,max:c.maxPlayers,blocked:!t.closed};
 });
 assert(created&&created.mode==='cap'&&created.competition,'Coupe interclubs : creation echouee');
 assert.equal(created.phase,'groups','Coupe interclubs : debut hors des poules');
 assert.equal(created.pools,2,'Coupe interclubs : deux poules attendues');
 assert.equal(created.groups,2,'Coupe interclubs : deux rencontres de poule attendues');
 assert(created.blocked,'Coupe interclubs : cloture permise avant les rencontres');
 assert.equal(created.min,2,'Course aux points : minimum effectif non conserve');
 assert.equal(created.max,4,'Course aux points : maximum effectif non conserve');
 const transition=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id),c=t.cap;
  for(const m of c.matches.filter(x=>x.phase==='groups')){
   m.relays=[{a:5,b:3},{a:10,b:8}];m.status='done';
  }
  const winners=c.pools.map((pool,i)=>capCompRanking(t,pool,'groups',i)[0].id);
  capCompClose();
  const blockedWithoutFinal=!t.closed;
  capCompNext();
  const final=c.matches.filter(m=>m.phase==='bracket');
  capCompClose();
  const blockedUnplayedFinal=!t.closed;
  return {phase:c.phase,round:c.round,winners,
   final:final.map(m=>({a:m.a,b:m.b,status:m.status})),
   blockedWithoutFinal,blockedUnplayedFinal,
   groupResults:c.matches.filter(m=>m.phase==='groups').map(m=>m.relays.length)};
 },created.id);
 assert.equal(transition.phase,'bracket','Coupe interclubs : tableau final non cree');
 assert.equal(transition.round,1,'Coupe interclubs : premier tour du tableau incorrect');
 assert.equal(transition.final.length,1,'Coupe interclubs : finale a deux clubs attendue');
 assert.deepEqual([transition.final[0].a,transition.final[0].b],transition.winners,
  'Coupe interclubs : qualifes non conformes aux classements de poule');
 assert.equal(transition.final[0].status,'waiting','Finale doit etre en attente');
 assert(transition.blockedWithoutFinal&&transition.blockedUnplayedFinal,
  'Coupe interclubs : cloture autorisee avant finale');
 assert.deepEqual(transition.groupResults,[2,2],'Relais de qualification perdus en creant le tableau');
 const finished=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id),c=t.cap;
  const m=c.matches.find(x=>x.phase==='bracket');
  m.relays=[{a:5,b:2},{a:10,b:7}];m.status='done';save();
  capCompClose();
  return {closed:t.closed,phase:c.phase,finalScore:capCompScore(m),
   matchCount:c.matches.length,priorRelays:c.matches.filter(x=>x.phase==='groups').map(x=>x.relays.length)};
 },created.id);
 assert(finished.closed,'Coupe interclubs : cloture finale refusee');
 assert.equal(finished.matchCount,3,'Coupe interclubs : rencontre perdue apres cloture');
 assert.deepEqual(finished.finalScore,{a:10,b:7},'Coupe interclubs : score final incorrect');
 assert.deepEqual(finished.priorRelays,[2,2],'Coupe interclubs : relais de poule perdus a la cloture');
 await page.reload({waitUntil:'domcontentloaded'});
 const resumed=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.id===id),c=t?.cap;
  if(!t)return null;
  const before=t.closed;
  db.selected=t.id;
  capCompClose();
  return {before,after:t.closed,phase:c.phase,
   matches:c.matches.map(m=>({status:m.status,score:capCompScore(m)})),
   separateSwiss:db.tournaments.some(x=>x.name==='Test Suisse'),
   separateMonster:db.tournaments.some(x=>x.name==='Test Monster mini impair')};
 },created.id);
 assert(resumed&&resumed.before&&!resumed.after,'Coupe interclubs : cloture/reouverture non preservees');
 assert(resumed.matches.every(x=>x.status==='done'),'Coupe interclubs : rencontres perdues au rechargement');
 assert.deepEqual(resumed.matches.map(x=>x.score),[{a:10,b:8},{a:10,b:8},{a:10,b:7}],
  'Coupe interclubs : scores modifies par la reprise');
 assert(resumed.separateSwiss&&resumed.separateMonster,'Coupe interclubs : un tournoi independant a disparu');
 console.log('OK Chromium : Coupe interclubs, poules vers finale, cloture bloquee, scores et reprise');

 // Championnat : trois clubs avec victoire, nul final 9-9 et classement 2/1/0.
 await page.evaluate(()=>{setTab('new');selectCreationMode('cap');});
 form=page.locator('form[onsubmit="capCompCreate(event)"]');
 await form.locator('[name="name"]').fill('Test Championnat interclubs');
 await form.locator('[name="structure"]').selectOption('league');
 await form.locator('[name="clubs"]').fill('Club Un\nClub Deux\nClub Trois');
 await form.locator('[name="targets"]').fill('5,10');
 await form.locator('[name="types"]').fill('S,D');
 await form.locator('[name="minPlayers"]').fill('2');
 await form.locator('[name="maxPlayers"]').fill('4');
 await form.locator('button').last().click();
 const league=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Championnat interclubs');
  if(!t)return null;
  const c=t.cap,ids=c.clubs.map(x=>x.id);
  capCompClose();
  const blocked=!t.closed;
  // Rencontres issues des couples (0-1), (0-2), (1-2).
  const scores=[[10,7],[9,9],[6,10]];
  c.matches.forEach((m,i)=>{m.status='done';m.relays=[{a:5,b:3},{a:scores[i][0],b:scores[i][1]}];});
  const ranking=capCompRanking(t,ids,'league');
  capCompClose();
  return {id:t.id,phase:c.phase,count:c.matches.length,blocked,closed:t.closed,
   ranking:ranking.map(x=>({name:capCompName(c,x.id),pts:x.pts,diff:x.for-x.against,played:x.played}))};
 });
 assert(league&&league.phase==='league'&&league.count===3,'Championnat interclubs : calendrier incorrect');
 assert(league.blocked&&league.closed,'Championnat interclubs : controles de cloture incorrects');
 assert.deepEqual(league.ranking.map(x=>[x.name,x.pts,x.diff,x.played]),
  [['Club Trois',3,4,2],['Club Un',3,3,2],['Club Deux',0,-7,2]],
  'Championnat interclubs : classement points/nul/difference incorrect : '+JSON.stringify(league.ranking));
 await page.reload({waitUntil:'domcontentloaded'});
 const persisted=await page.evaluate(()=>{const t=db.tournaments.find(x=>x.name==='Test Championnat interclubs');return {closed:t?.closed,results:t?.cap?.matches?.map(m=>capCompScore(m)),cup:db.tournaments.find(x=>x.name==='Test Coupe interclubs')?.cap?.phase};});
 assert(persisted.closed&&persisted.results?.length===3,'Championnat interclubs : perdus apres recharge');
 assert.equal(persisted.cup,'bracket','Championnat interclubs : Coupe independante alteree');
 console.log('OK Chromium : Championnat interclubs 3 clubs, 2/1/0, difference et persistance');
}


/* Course aux points : saisie interactive dans la vraie interface fictive. */
async function capInteractiveRelayFlow(page){
 await page.evaluate(fixture=>{db.players=fixture;save();setTab('new');selectCreationMode('cap');},players);
 const form=page.locator('form[onsubmit="capCompCreate(event)"]');
 await form.locator('[name="name"]').fill('Test Saisie relais interclubs');
 await form.locator('[name="structure"]').selectOption('league');
 await form.locator('[name="clubs"]').fill('Equipe Est\nEquipe Ouest');
 await form.locator('[name="targets"]').fill('5,10');
 await form.locator('[name="types"]').fill('S,D');
 await form.locator('[name="minPlayers"]').fill('2');
 await form.locator('[name="maxPlayers"]').fill('2');
 await form.locator('button').last().click();
 const refs=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Saisie relais interclubs');
  if(!t)return null;
  window.__capInteractiveAlerts=[];
  window.alert=msg=>window.__capInteractiveAlerts.push(String(msg));
  return {id:t.id,clubs:t.cap.clubs.map(x=>x.id),match:t.cap.matches[0].id};
 });
 assert(refs&&refs.clubs.length===2,'Interclubs interactif : echec creation');
 await page.evaluate(()=>render());
 // The function must reject an empty roster and prevent score entry without composition.
 const premature=await page.evaluate(id=>{
  capSaveRosters();
  const t=active(),m=t.cap.matches.find(x=>x.id===id);
  capCompRecord(id);
  return {rosters:t.cap.rosters||null,relays:m.relays.length,alerts:window.__capInteractiveAlerts.slice()};
 },refs.match);
 assert(!premature.rosters&&premature.relays===0,'CAP : effectifs incomplets ou composition absente acceptes');
 assert(premature.alerts.some(x=>x.includes('entre 2 et 2 joueurs')),'CAP : message de contrôle effectif absent : '+JSON.stringify(premature));
 assert(premature.alerts.some(x=>x.includes('compositions')),'CAP : saisie sans composition non bloquee : '+JSON.stringify(premature));
 // Select two distinct fictitious players per club through the rendered roster checkboxes.
 const chosen=await page.evaluate(({clubs,playerIds})=>{
  for(let i=0;i<clubs.length;i++){
   for(let j=0;j<2;j++){
    const el=document.querySelector('[data-cap-roster="'+clubs[i]+'"][value="'+playerIds[i*2+j]+'"]');
    if(!el)throw Error('Case de joueur fictif absente');
    el.checked=true;
   }
  }
  capSaveRosters();
  const t=active(),sizes=t.cap.clubs.map(x=>t.cap.rosters[x.id]?.length||0);
  render();
  return sizes;
 },{clubs:refs.clubs,playerIds:players.map(x=>x.id)});
 assert.deepEqual(chosen,[2,2],'Interclubs : enregistrement des effectifs a echoue');
 // Fill all six selects in the real composition editor (S for each club, D for each club).
 for(let i=0;i<2;i++){
  const team=refs.clubs[i],names=players.slice(i*2,i*2+2).map(p=>p.first+' '+p.last);
  await page.locator('[id="cap-pick-'+refs.match+'-'+team+'-0-0"]').selectOption(names[0]);
  await page.locator('[id="cap-pick-'+refs.match+'-'+team+'-1-0"]').selectOption(names[0]);
  await page.locator('[id="cap-pick-'+refs.match+'-'+team+'-1-1"]').selectOption(names[1]);
 }
 await page.locator('button[onclick="capSaveComposition(\''+refs.match+'\')"]').click();
 const comp=await page.evaluate(id=>{
  const m=active().cap.matches.find(x=>x.id===id);
  return {validated:m.compositionsValidated,slots:Object.values(m.compositions||{}).map(s=>s.map(x=>x.length))};
 },refs.match);
 assert(comp.validated,'CAP : composition validee non enregistree');
 assert.deepEqual(comp.slots,[[1,2],[1,2]],'CAP : composition simple/double alteree');
 // A relay below its target must be rejected before accepting 5-3.
 await page.locator('[id="capca-'+refs.match+'"]').fill('4');
 await page.locator('[id="capcb-'+refs.match+'"]').fill('3');
 await page.locator('button[onclick="capCompRecord(\''+refs.match+'\')"]').click();
 const refused=await page.evaluate(id=>active().cap.matches.find(x=>x.id===id).relays.length,refs.match);
 assert.equal(refused,0,'CAP : score sous palier accepte a tort');
 await page.locator('[id="capca-'+refs.match+'"]').fill('5');
 await page.locator('button[onclick="capCompRecord(\''+refs.match+'\')"]').click();
 const first=await page.evaluate(id=>active().cap.matches.find(x=>x.id===id).relays,refs.match);
 assert.deepEqual(first,[{a:5,b:3}],'CAP : premier relais 5-3 non enregistre');
 await page.evaluate(()=>render());
 await page.locator('[id="capca-'+refs.match+'"]').fill('10');
 await page.locator('[id="capcb-'+refs.match+'"]').fill('7');
 await page.locator('button[onclick="capCompRecord(\''+refs.match+'\')"]').click();
 let completed=await page.evaluate(id=>{
  const m=active().cap.matches.find(x=>x.id===id);
  return {score:capCompScore(m),status:m.status};
 },refs.match);
 assert.deepEqual(completed,{score:{a:10,b:7},status:'done'},'CAP : rencontre deux relais non terminee');
 await page.evaluate(()=>{window.confirm=()=>true;render();});
 await page.locator('button[onclick="capCompUndo(\''+refs.match+'\')"]').first().click();
 const undone=await page.evaluate(id=>{
  const m=active().cap.matches.find(x=>x.id===id);
  return {relays:m.relays,done:m.status==='done'};
 },refs.match);
 assert.deepEqual(undone,{relays:[{a:5,b:3}],done:false},'CAP : correction a perdu le premier relais');
 await page.evaluate(()=>render());
 await page.locator('[id="capca-'+refs.match+'"]').fill('10');
 await page.locator('[id="capcb-'+refs.match+'"]').fill('8');
 await page.locator('button[onclick="capCompRecord(\''+refs.match+'\')"]').click();
 const final=await page.evaluate(id=>{
  const t=active(),m=t.cap.matches.find(x=>x.id===id);
  capCompClose();
  return {closed:t.closed,relays:m.relays,status:m.status,validated:m.compositionsValidated,
   sizes:t.cap.clubs.map(x=>t.cap.rosters[x.id].length)};
 },refs.match);
 assert(final.closed&&final.validated&&final.status==='done','CAP : cloture ou composition invalide');
 assert.deepEqual(final.relays,[{a:5,b:3},{a:10,b:8}],'CAP : score corrige 10-8 non conserve');
 assert.deepEqual(final.sizes,[2,2],'CAP : effectifs perdus');
 await page.reload({waitUntil:'domcontentloaded'});
 const persisted=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.name==='Test Saisie relais interclubs');
  const m=t?.cap.matches.find(x=>x.id===id);
  return {closed:t?.closed,relays:m?.relays,composition:m?.compositionsValidated,
   rosterSizes:t?.cap.clubs.map(x=>t.cap.rosters?.[x.id]?.length)};
 },refs.match);
 assert(persisted.closed&&persisted.composition,'CAP : cloture/composition perdues au rechargement');
 assert.deepEqual(persisted.relays,[{a:5,b:3},{a:10,b:8}],'CAP : relais perdus au rechargement');
 assert.deepEqual(persisted.rosterSizes,[2,2],'CAP : effectifs perdus au rechargement');
 console.log('OK Chromium : CAP interclubs saisie DOM, effectifs, composition, relais, correction et persistance');
}


/* Championnat CAP : 42 points, sept relais, composition de six joueurs par club.
   Scenarios avec uniquement des joueurs fictifs et formulaires reels du navigateur. */
async function capChampSevenRelays(page){
 const fixture=Array.from({length:12},(_,i)=>({id:'CAP7-'+(i+1),first:'Fictif'+(i+1),last:'CAP7'}));
 await page.evaluate(players=>{db.players=players;save();setTab('new');selectCreationMode('cap');},fixture);
 const form=page.locator('form[onsubmit="capCompCreate(event)"]');
 await form.locator('[name="name"]').fill('Test Sept Relais CAP');
 await form.locator('[name="structure"]').selectOption('league');
 await form.locator('[name="clubs"]').fill('Equipe Nord\nEquipe Sud');
 await form.locator('[name="preset"]').selectOption('champ');
 await form.locator('button').last().click();
 await page.evaluate(()=>render());
 const refs=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Sept Relais CAP');
  if(!t)return null;
  window.__cap7Alerts=[];window.alert=msg=>window.__cap7Alerts.push(String(msg));
  return {id:t.id,match:t.cap.matches[0].id,clubs:t.cap.clubs.map(x=>x.id),
   targets:t.cap.targets,types:t.cap.types};
 });
 assert(refs&&refs.clubs.length===2,'CAP 7 relais : creation absente');
 assert.deepEqual(refs.targets,[6,12,18,24,30,36,42],'CAP 7 relais : paliers incorrects');
 assert.deepEqual(refs.types,['D','D','D','S','D','S','D'],'CAP 7 relais : types incorrects');
 const teamNames=[fixture.slice(0,6).map(p=>p.first+' '+p.last),fixture.slice(6,12).map(p=>p.first+' '+p.last)];
 const sizes=await page.evaluate(({refs,players})=>{
  for(let i=0;i<2;i++)for(const player of players.slice(i*6,i*6+6)){
   const input=document.querySelector('[data-cap-roster="'+refs.clubs[i]+'"][value="'+player.id+'"]');
   if(!input)throw Error('CAP : joueur fictif non trouve dans les effectifs');
   input.checked=true;
  }
  capSaveRosters();
  const t=active(),r=refs.clubs.map(id=>t.cap.rosters?.[id]?.length||0);
  render();return r;
 },{refs,players:fixture});
 assert.deepEqual(sizes,[6,6],'CAP 7 relais : effectifs non conserves');
 const valid=[[0,1],[2,3],[4,5],[0],[1,2],[3],[4,5]];
 async function fill(scheme){
  await page.evaluate(({refs,teamNames,scheme,valid})=>{
   refs.clubs.forEach((club,team)=>{
    const relays=team===0?scheme:valid;
    relays.forEach((members,i)=>members.forEach((index,j)=>{
     const el=document.getElementById('cap-pick-'+refs.match+'-'+club+'-'+i+'-'+j);
     if(!el)throw Error('CAP : champ composition non trouve');
     el.value=teamNames[team][index];
    }));
   });
  },{refs,teamNames,scheme,valid});
 }
 async function reject(scheme,warning,label){
  await fill(scheme);
  await page.locator('button[onclick^="capSaveComposition("]').click();
  const result=await page.evaluate(id=>{
   const m=active().cap.matches.find(x=>x.id===id);
   return {accepted:!!m.compositionsValidated,alert:window.__cap7Alerts.at(-1)};
  },refs.match);
  assert(!result.accepted,label+' : invalide accepte');
  assert(result.alert&&(result.alert.includes(warning)||result.alert.includes('Composition incompatible')),label+' : message inattendu '+JSON.stringify(result));
 }
 let bad=valid.map(x=>x.slice());bad[0]=[0,0];
 await reject(bad,'deux places du même double','Double avec joueur duplique');
 bad=valid.map(x=>x.slice());bad[2]=[0,5];
 await reject(bad,'trois premiers doubles','Six joueurs distincts premiers doubles');
 bad=valid.map(x=>x.slice());bad[6]=[4,0];
 await reject(bad,'quatre derniers relais','Six joueurs distincts quatre derniers relais');
 bad=valid.map(x=>x.slice());bad[3]=[4];bad[6]=[0,5];
 await reject(bad,'deux relais consécutifs','Relais consecutifs');
 await fill(valid);
 await page.locator('button[onclick^="capSaveComposition("]').click();
 const accepted=await page.evaluate(id=>{
  const t=active(),m=t.cap.matches.find(x=>x.id===id);
  return {validated:!!m.compositionsValidated,slots:Object.values(m.compositions||{}).map(x=>x.map(y=>y.length))};
 },refs.match);
 assert(accepted.validated,'CAP 7 relais : composition legale refusee');
 assert.deepEqual(accepted.slots,[[2,2,2,1,2,1,2],[2,2,2,1,2,1,2]],
  'CAP 7 relais : composition memorisee incorrectement');
 const scores=await page.evaluate(({match,targets})=>{
  const t=active(),history=[];
  for(let i=0;i<targets.length;i++){
   const a=document.getElementById('capca-'+match),b=document.getElementById('capcb-'+match);
   if(!a||!b)throw Error('CAP 7 relais : champs de saisie absents au palier '+i);
   a.value=String(targets[i]);b.value=String(targets[i]-2);
   capCompRecord(match);
   const m=t.cap.matches.find(x=>x.id===match);
   history.push({n:m.relays.length,score:capCompScore(m),status:m.status});
  }
  window.confirm=()=>true;
  capCompUndo(match);
  const m=t.cap.matches.find(x=>x.id===match);
  const afterUndo={n:m.relays.length,score:capCompScore(m),status:m.status};
  const a=document.getElementById('capca-'+match),b=document.getElementById('capcb-'+match);
  if(!a||!b)throw Error('CAP 7 relais : champs correction absents');
  a.value='42';b.value='39';capCompRecord(match);
  capCompClose();
  return {history,afterUndo,closed:t.closed,final:capCompScore(m),
   status:m.status,validated:m.compositionsValidated};
 },{match:refs.match,targets:refs.targets});
 for(let i=0;i<7;i++){
  assert.equal(scores.history[i].n,i+1,'CAP 7 relais : progression du nombre de relais incorrecte');
  assert.deepEqual(scores.history[i].score,{a:refs.targets[i],b:refs.targets[i]-2},
   'CAP 7 relais : score cumule incorrect au relais '+(i+1));
 }
 assert.deepEqual(scores.afterUndo,{n:6,score:{a:36,b:34},status:'waiting'},
  'CAP 7 relais : retrait dernier relais incorrect');
 assert(scores.closed&&scores.validated&&scores.status==='done','CAP 7 relais : cloture ou composition perdue');
 assert.deepEqual(scores.final,{a:42,b:39},'CAP 7 relais : correction du score final incorrecte');
 await page.reload({waitUntil:'domcontentloaded'});
 const stored=await page.evaluate(id=>{
  const t=db.tournaments.find(x=>x.name==='Test Sept Relais CAP');
  const m=t?.cap.matches.find(x=>x.id===id);
  return {closed:t?.closed,n:m?.relays.length,score:capCompScore(m),
   compositions:!!m?.compositionsValidated,rosters:t?.cap.clubs.map(x=>t.cap.rosters[x.id].length)};
 },refs.match);
 assert.deepEqual(stored,{closed:true,n:7,score:{a:42,b:39},compositions:true,rosters:[6,6]},
  'CAP 7 relais : reprise apres rechargement incorrecte');
 console.log('OK Chromium : CAP Championnat 42 points, 7 relais, compositions contraintes et correction');
}


/* Course aux points, championnat fictif à quatre clubs et deux tables :
   attribution automatique sans collision, refus exclusion et libération. */
async function capConcurrentTables(page){
 await page.evaluate(()=>{setTab('new');selectCreationMode('cap');});
 const f=page.locator('form[onsubmit="capCompCreate(event)"]');
 await f.locator('[name="name"]').fill('Test Tables CAP');
 await f.locator('[name="structure"]').selectOption('league');
 await f.locator('[name="clubs"]').fill('Club A\nClub B\nClub C\nClub D');
 await f.locator('[name="targets"]').fill('5,10');
 await f.locator('[name="types"]').fill('S,D');
 await f.locator('button').last().click();
 const data=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Tables CAP');
  if(!t)return null;
  const c=t.cap;window.__capTableAlerts=[];window.alert=msg=>window.__capTableAlerts.push(String(msg));
  const tableCount=document.getElementById('cap-table-count');
  if(!tableCount)throw Error('Panneau de nombre de tables manquant');
  window.confirm=()=>true;tableCount.value='2';capSetTableCount();
  if(t.tables.length!==2)throw Error('CAP tables : reglage a deux tables non applique');
  capAutoAssign();
  const playing=c.matches.filter(m=>m.tableId!=null);
  const occupied=playing.flatMap(m=>[m.a,m.b]);
  const first={tables:playing.map(m=>m.tableId),clubs:occupied,matchIds:playing.map(m=>m.id)};
  capAutoAssign();
  const repeated=c.matches.filter(m=>m.tableId!=null).length;
  const x=document.getElementById('cap-table-state-1');
  if(!x)throw Error('Panneau de tables manquant');
  x.value='excluded';capSetTable(1);
  const blocked=t.tables.find(x=>x.id===1)?.state==='free';
  const excludedAlert=window.__capTableAlerts.at(-1)||'';
  // Finish one and verify the other table remains reserved.
  const one=playing[0],two=playing[1];
  one.status='done';one.relays=[{a:5,b:3},{a:10,b:8}];one.tableId=null;save();
  capAutoAssign();
  const afterOne=c.matches.filter(m=>m.tableId!=null).map(m=>m.id);
  two.status='done';two.relays=[{a:5,b:3},{a:10,b:8}];two.tableId=null;save();
  capAutoAssign();
  const secondWave=c.matches.filter(m=>m.tableId!=null);
  const clubs2=secondWave.flatMap(m=>[m.a,m.b]);
  const snapshot={first,repeated,blocked,excludedAlert,afterOne,secondWave:secondWave.map(m=>({table:m.tableId,id:m.id})),
   clubs2,done:c.matches.filter(m=>m.status==='done').length};
  return snapshot;
 });
 assert(data,'CAP tables : championnat fictif absent');
 assert.equal(data.first.tables.length,2,'CAP tables : deux tables non attribuees');
 assert.equal(new Set(data.first.tables).size,2,'CAP tables : meme table attribuee deux fois');
 assert.equal(new Set(data.first.clubs).size,4,'CAP tables : meme club affecte a deux rencontres');
 assert.equal(data.repeated,2,'CAP tables : auto-attribution a doublement reserve');
 assert(data.blocked&&data.excludedAlert.includes('attribuée'),'CAP tables : exclusion de table occupee autorisee');
 assert.deepEqual(data.afterOne,[data.first.matchIds[1]],'CAP tables : nouveau match attribue avec club deja occupe');
 assert.equal(data.secondWave.length,2,'CAP tables : deux rencontres suivantes non attribuees');
 assert.equal(new Set(data.secondWave.map(x=>x.table)).size,2,'CAP tables : collision deuxieme vague');
 assert.equal(new Set(data.clubs2).size,4,'CAP tables : club en double apres liberation');
 assert.equal(data.done,2,'CAP tables : scores de la premiere vague non preserves');
 await page.reload({waitUntil:'domcontentloaded'});
 const resumed=await page.evaluate(()=>{
  const t=db.tournaments.find(x=>x.name==='Test Tables CAP');
  return {tables:t?.tables?.length,occupied:t?.cap?.matches?.filter(m=>m.tableId!=null).map(m=>m.tableId),
   done:t?.cap?.matches?.filter(m=>m.status==='done').length};
 });
 assert.equal(resumed.tables,2,'CAP tables : parc perdu au rechargement');
 assert.equal(resumed.done,2,'CAP tables : scores perdus au rechargement');
 assert.equal(new Set(resumed.occupied).size,2,'CAP tables : doublon de table apres reprise');
 console.log('OK Chromium : CAP quatre clubs, deux tables, exclusivite clubs, exclusion bloquee et reprise');
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
  await monsterMiniOddRotation(page);
  await capCompetitionCupFlow(page);
  await capInteractiveRelayFlow(page);
  await capChampSevenRelays(page);
  await capConcurrentTables(page);
  assert.deepEqual(errors,[],'Erreurs navigateur : '+errors.join('; '));
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});