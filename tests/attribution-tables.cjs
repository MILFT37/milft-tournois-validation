const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim()&&!/\bsrc=/.test(s));
for(const [i,source] of scripts.entries()){new vm.Script(source,{filename:'inline-'+i+'.js'});}
const checks={
 'attribution apres resultat':/if\(t\.mode==='knockout'\)advanceKnockout\(t\);\s*autoAssign\(t\);/.test(html),
 'attribution apres forfait':/autoAssign\(t\);\s*save\(\);flash\('Forfait enregistré/.test(html),
 'report bloque avant reattribution':/m\.hold=true;milftReleaseSharedTable\(t,released\);autoAssign\(t\);save\(\);flash\('Rencontre reportée/.test(html),
 'reprise declenche attribution':/if\(!m\.hold\)autoAssign\(t\);save\(\);render\(\)/.test(html),
 'deplacement libere et attribue':/milftReleaseSharedTable\(t,previous\);autoAssign\(t\);save\(\);flash\('Match déplacé/.test(html),
 'navigation phases sur ligne haute':/milft-has-phase-quicknav #milft-quicknav \[data-phase\]\{grid-row:1\}/.test(html),
 'navigation classique sur ligne basse':/milft-has-phase-quicknav #milft-quicknav \[data-section\]\{grid-row:2\}/.test(html),
 'regroupement phases dans liste':/function activeTournamentsPage\(\)[\s\S]*?const groups=new Map\(\)/.test(html),
 'vue trois niveaux':/function milftShowBracketOverview\(\)/.test(html)&&/milft-three-round-overview/.test(html),
 'choix poules ou tableaux':/function milftFinalDecisionNotice\(t\)/.test(html)&&/function milftExtendQualifications\(\)/.test(html),
 'priorite dans file':/eligible\.sort\(\(a,b\)=>\(Number\(!!b\.milftPriority\)-Number\(!!a\.milftPriority\)\)/.test(html)
};
for(const [name,ok] of Object.entries(checks)){console.log((ok?'OK ':'ECHEC ')+name);assert(ok,name);}
console.log('OK syntaxe de '+scripts.length+' scripts embarques; '+Object.keys(checks).length+' controles statiques.');
const extract=name=>{const start=html.indexOf('function '+name+'(');assert(start>=0,name+' introuvable');const end=html.indexOf('\nfunction ',start+1);return html.slice(start,end<0?undefined:end);};
const context={db:{tournaments:[]},matchPlayerIds:(t,m)=>[m.a,m.b],participantMembers:(t,id)=>[id],Date};
vm.createContext(context);
vm.runInContext(['milftEventRootId','busyPlayers','milftAnnualNextMatch','milftFairNextMatch','milftFreeTables','autoAssign'].map(extract).join('\n'),context);
const match=(id,a,b,priority=false,hold=false)=>({id,a,b,status:'waiting',round:1,milftPriority:priority,hold});
const t={id:'solo',mode:'poules',currentRound:1,roundLimit:2,roster:[],matches:[match('normal','A','B'),match('prioritaire','C','D',true),match('reporte','E','F',true,true)],tables:[{id:1,state:'free'}]};
context.db.tournaments=[t];context.autoAssign(t);
assert.strictEqual(t.matches[1].status,'playing','La rencontre prioritaire doit demarrer');
assert.strictEqual(t.matches[2].status,'waiting','Une rencontre reportee ne doit pas demarrer');
assert.strictEqual(t.matches[0].status,'waiting','Une seule table ne doit lancer qu un match');
t.tables[0].state='free';t.matches[1].status='done';context.autoAssign(t);
assert.strictEqual(t.matches[0].status,'playing','La table liberee doit etre reutilisee');
console.log('OK tests fonctionnels : priorite, report, reattribution, capacite table');
const p={id:'p',mode:'poules',roster:[],matches:[],tables:[{id:1,state:'free'}]};
const ka={id:'A',sourceId:'p',mode:'knockout',roster:[],matches:[match('A1','A','B')],tables:[{id:1,state:'free'}]};
const kb={id:'B',sourceId:'p',mode:'knockout',roster:[],matches:[match('B1','C','D',true)],tables:[{id:1,state:'free'}]};
context.db.tournaments=[p,ka,kb];context.autoAssign(ka);
assert.strictEqual(kb.matches[0].status,'playing','La priorite du tableau B doit passer devant A');
assert.strictEqual(ka.matches[0].status,'waiting','La table commune ne doit pas etre doublement affectee');
assert.deepStrictEqual(Array.from(context.milftFreeTables(ka)),[],'La table occupee par B doit etre indisponible dans A');
console.log('OK attribution partagee entre tableaux A/B');
const busyFn=html.match(/function busyPlayers\(t\)\{[^\n]*\}/);
const freeFn=[extract('milftFreeTables')];
assert(busyFn&&freeFn,'Fonctions de protection inter-tableaux introuvables');
const sharedDb={tournaments:[
 {id:'poules',mode:'poules',matches:[],roster:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]},
 {id:'A',sourceId:'poules',mode:'knockout',matches:[{status:'playing',a:'J1',b:'J2',table:1}],roster:[],tables:[{id:1,state:'playing'},{id:2,state:'free'}]},
 {id:'B',sourceId:'poules',mode:'knockout',matches:[],roster:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]}
]};
const linked=new Function('db','matchPlayerIds',extract('milftEventRootId')+'\n'+busyFn[0]+'\n'+extract('milftFreeTables')+'\nreturn {busyPlayers,milftFreeTables}')(sharedDb,(t,m)=>[m.a,m.b]);
assert.deepStrictEqual(linked.milftFreeTables(sharedDb.tournaments[2]).map(x=>x.id),[2],'La table 1 est deja occupee par A');
assert(linked.busyPlayers(sharedDb.tournaments[2]).has('J1'),'Joueur de A non protege dans B');
console.log('OK protections inter-tableaux : tables et joueurs occupes');

/* Regression navigation : verifier les intitulés réels des écrans sans navigateur. */
const navStart=html.indexOf('function milftQuicknavTargets(root){');
const navEnd=html.indexOf('\nfunction milftRefreshQuicknav(',navStart);
assert(navStart>=0&&navEnd>navStart,'Fonction de navigation rapide absente');
const quicknav=new Function(html.slice(navStart,navEnd)+';return milftQuicknavTargets')();
const heading=label=>{const card={label};return {textContent:label,closest:selector=>selector==='.card'?card:null,card};};
const navRoot=labels=>{const nodes=labels.map(heading);return {nodes,querySelectorAll:selector=>selector==='.card h2'?nodes:[]};};
for(const [label,section] of [
 ['Rencontres en cours','matchs'],['Rencontres à lancer','matchs'],['Matchs à lancer','matchs'],
 ['Attribution des rencontres','matchs'],['Gestion des tables','tables'],['Tables','tables'],
 ['Classement individuel cumulatif','classement'],['Avancement du tournoi','avancement']
]){
 const root=navRoot([label]),targets=quicknav(root);
 assert.strictEqual(targets[section],root.nodes[0].card,'Raccourci invalide : '+label);
}
const mixed=navRoot(['Rencontres en cours','Rencontres à lancer','Gestion des tables','Classement','Avancement du tournoi']);
assert.strictEqual(quicknav(mixed).matchs,mixed.nodes[0].card,'Le premier panneau des matchs doit rester prioritaire');
assert.deepStrictEqual(Object.values(quicknav(null)),[null,null,null,null],'Navigation sans tournoi');
assert(/milft-table-inline-controls/.test(html)&&/Modele de tables valide : statut en premiere ligne/.test(html),'Modele des cartes de tables absent');
assert(!/#view \.milft-table-state-edit\{/.test(html),'Ancien panneau repliable des tables réintroduit');
assert(!html.includes('${milftPriorityButton(t,m)}${milftPriorityButton(t,m)}'),'Bouton Prioriser affiche en double dans le championnat annuel');
console.log('OK championnat annuel : absence de doublon du bouton Prioriser');

// Navigation des tableaux : la vue trois niveaux doit reutiliser le selecteur de rondes.
const overviewSource=extract('milftShowBracketOverview');
const showRoundSource=extract('showKoRound');
assert(/if\(active\)\{showKoRound\(koVisibleRound\);\}/.test(overviewSource),'Vue trois niveaux non synchronisee avec la ronde');
assert(/milft-overview-visible/.test(showRoundSource)&&/ko-round-picker/.test(showRoundSource),'Navigation mobile des rondes incomplete');
assert(/Math\.max\(0,rounds\.length-3\)/.test(showRoundSource),'Fenetre trois niveaux non bornee');
assert(/milftRefreshQuicknav\(\);\s*container\.scrollIntoView/.test(overviewSource),'Etat du bouton Vue ensemble non rafraichi apres bascule');
const phaseNavSource=extract('milftQuickPhase');
assert(/overviewActive&&chosen\.mode==='knockout'/.test(phaseNavSource)&&/milftRefreshQuicknav\(\)/.test(phaseNavSource),'Vue trois niveaux non conservee entre tableaux A et B');
console.log('OK tableau final : synchronisation trois niveaux et selecteur de rondes');
console.log('OK navigation rapide : 8 libelles, priorite, absence de tournoi et modele de tables');

/* Regression Course aux points : la cloture doit lire cap.matches et respecter les tableaux. */
const canCloseSource=extract('milftCanClose');
const canClose=new Function('capCompScore','milftHasPendingStages',canCloseSource+';return milftCanClose')(
 m=>m?.relays?.length?m.relays[m.relays.length-1]:(m?.bye?m.score:null),
 ()=>false
);
const capMatch=(status,a=30,b=20)=>({status,phase:'groups',relays:[{a,b}]});
const capBase={mode:'cap',matches:[],cap:{matches:[capMatch('done')],phase:'groups',bracket:false}};
assert.strictEqual(canClose(capBase),true,'Course aux points finie sans tableau');
assert.strictEqual(canClose({...capBase,cap:{...capBase.cap,matches:[capMatch('waiting')]}}),false,'Rencontre en attente');
assert.strictEqual(canClose({...capBase,cap:{...capBase.cap,matches:[{status:'done',phase:'groups',relays:[]}]}}),false,'Score manquant');
assert.strictEqual(canClose({...capBase,cap:{...capBase.cap,bracket:true}}),false,'Tableau final attendu');
const capFinal={...capBase,cap:{matches:[capMatch('done'),{status:'done',phase:'bracket',round:1,relays:[{a:42,b:30}]}],phase:'bracket',round:1,bracket:true}};
assert.strictEqual(canClose(capFinal),true,'Finale jouee');
assert.strictEqual(canClose({...capFinal,cap:{...capFinal.cap,matches:[capMatch('done'),{status:'done',phase:'bracket',round:1,relays:[{a:42,b:42}]}]}}),false,'Finale a egalite');
assert.strictEqual(canClose({...capFinal,cap:{...capFinal.cap,matches:[capMatch('done'),{status:'done',phase:'bracket',round:1,relays:[{a:42,b:30}]},{status:'done',phase:'bracket',round:1,relays:[{a:42,b:30}]}]}}),false,'Tour final non acheve');
assert.strictEqual(canClose({mode:'poules',matches:[{status:'done'}]}),true,'Formats classiques conserves');
console.log('OK Course aux points : 7 cas de cloture et format classique');

/* Regression accueil : ne jamais masquer une competition terminee mais non cloturee. */
const dashStart=html.indexOf('function dashboard(){');
const dashEnd=html.indexOf('\n function playersPage()',dashStart);
assert(dashStart>=0&&dashEnd>dashStart,'Fonction tableau de bord introuvable');
const dashboardSource=html.slice(dashStart,dashEnd);
assert(/phases\.some\(t=>!t\.closed&&!t\.abandoned\)/.test(dashboardSource),'Accueil masque les tournois non clotures');
assert(!/\.filter\(\(\[,phases\]\)=>phases\.some\(t=>!t\.closed&&!t\.abandoned&&!milftCanClose\(t\)\)\)/.test(dashboardSource),'Ancien filtre des tournois terminables restaure');
assert(dashboardSource.includes('clôture à vérifier'),'Signalement de cloture absent');
assert(dashboardSource.includes('phase à poursuivre'),'Le tableau de bord ne distingue pas la prochaine phase de la cloture');
console.log('OK accueil : competition non cloturee conservee et signalement explicite');

/* Regression navigation entre phases : utiliser le meme regroupement que l'accueil. */
const phaseStart=html.indexOf('function milftQuickPhase(target){');
const phaseEnd=html.indexOf('\nfunction milftShowBracketOverview()',phaseStart);
assert(phaseStart>=0&&phaseEnd>phaseStart,'Navigation Poules/A/B introuvable');
const phaseSource=html.slice(phaseStart,phaseEnd);
assert(phaseSource.includes('milftEventRootId(t)'),'La navigation des phases ne suit plus le regroupement evenement');
assert(phaseSource.includes('milftEventRootId(x)===root'),'Les tableaux lies ne sont plus recherches par evenement');
assert(phaseSource.includes('!x.abandoned'),'Une phase abandonnee peut reapparaitre dans la navigation');
console.log('OK navigation phases : regroupement evenement, sauvegardes historiques et exclusion abandon');

/* Regression : les raccourcis et la vue globale ignorent les phases abandonnees. */
const refreshStart=html.indexOf('function milftRefreshQuicknav(){');
const refreshEnd=html.indexOf('\nfunction milftJump(',refreshStart);
assert(refreshStart>=0&&refreshEnd>refreshStart,'Rafraichissement navigation introuvable');
const refreshSource=html.slice(refreshStart,refreshEnd);
assert(refreshSource.includes('!x.abandoned'),'Raccourcis : phases abandonnees non exclues');
assert(refreshSource.includes('phases=visible?'),'Navigation hors tournoi non neutralisee');
const overviewStart=html.indexOf('function milftShowBracketOverview(){');
const overviewEnd=html.indexOf('\nfunction milftQuicknavTargets(',overviewStart);
assert(overviewStart>=0&&overviewEnd>overviewStart,'Vue generale tableau introuvable');
assert(html.slice(overviewStart,overviewEnd).includes('!x.abandoned'),'Vue tableau : phase abandonnee selectionnable');
console.log('OK navigation : phases abandonnees exclues des raccourcis et de la vue tableau');

/* Regression sauvegardes historiques : phase A/B sans sourceId mais reliee par finalId. */
const historic={id:'historic',mode:'poules',name:'Tournoi historique',date:'2026-11-08',finalPhase:true,finalId:'oldA',finalBId:'oldB',roster:[],matches:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]};
const oldA={id:'oldA',mode:'knockout',bracketLetter:'A',name:'Tournoi historique — Tableau A',date:historic.date,roster:[],matches:[{id:'A1',status:'playing',a:'P1',b:'P2',table:1}],tables:[{id:1,state:'playing'},{id:2,state:'free'}]};
const oldB={id:'oldB',mode:'knockout',bracketLetter:'B',name:'Tournoi historique — Tableau B',date:historic.date,roster:[],matches:[match('B1','P3','P4')],tables:[{id:1,state:'free'},{id:2,state:'free'}]};
context.db.tournaments=[historic,oldA,oldB];
assert.strictEqual(context.milftEventRootId(oldA),'historic','Tableau A historique non rattache');
assert.strictEqual(context.milftEventRootId(oldB),'historic','Tableau B historique non rattache');
assert.deepStrictEqual(Array.from(context.milftFreeTables(oldB),x=>x.id),[2],'Table partagee deja occupee non bloquee');
assert(context.busyPlayers(oldB).has('P1'),'Joueur occupe dans tableau A non protege pour B');
context.autoAssign(oldB);
assert.strictEqual(oldB.matches[0].table,2,'Table libre 2 non attribuee au tableau B');
assert.strictEqual(oldB.matches[0].status,'playing','Rencontre historique B non lancee');
console.log('OK sauvegardes historiques : regroupement A/B, blocage table, joueurs et attribution');

/* Regression : liberer une table historique sans effacer l'occupation de l'autre tableau. */
const releaseSource=extract('milftReleaseSharedTable');
assert(releaseSource.includes('milftEventRootId(t)'),'Liberation sans regroupement evenement');
assert(releaseSource.includes('milftEventRootId(x)===root'),'Liberation ignore les tableaux historiques');
const release=new Function('db','milftEventRootId',releaseSource+';return milftReleaseSharedTable')(context.db,context.milftEventRootId);
release(oldB,1);
assert.strictEqual(oldA.tables[0].state,'playing','Table occupee A liberee a tort depuis B');
oldA.matches[0].status='done';
release(oldB,1);
assert.strictEqual(oldA.tables[0].state,'free','Table A non liberee apres resultat');
const stateStart=html.indexOf('function changeTableState(id){');
const stateEnd=html.indexOf('\nfunction ',stateStart+1);
assert(stateStart>=0&&stateEnd>stateStart,'Changement etat tables absent');
const stateSource=html.slice(stateStart,stateEnd);
assert(stateSource.includes('milftEventRootId(t)')&&stateSource.includes('milftEventRootId(x)===root'),'Changement etat ignore les phases historiques');
console.log('OK tables partagees : liberation protegee et changement etat coherent avec A/B historiques');

/* Regression : attribution manuelle, deplacement et attribution generale partagent le meme parc. */
for(const [name,next] of [['moveMatch','milftLaunchSelectedAnnual'],['assignSpecific','autoNow'],['autoNow','editDone']]){
 const begin=html.indexOf('function '+name+'('),end=html.indexOf('function '+next+'(',begin+1);
 assert(begin>=0&&end>begin,'Fonction '+name+' introuvable');
 const body=html.slice(begin,end);
 assert(body.includes('milftEventRootId(t)'),'Parc evenement absent dans '+name);
 assert(body.includes('milftEventRootId(x)===root'),'Phases liees non prises en compte dans '+name);
}
console.log('OK attribution manuelle, deplacement et attribution generale : parc evenement commun');

/* Regression : navigation depuis une phase archivee vers les tableaux du meme evenement. */
const archiveStart=html.indexOf('function milftArchiveLinkedPhases(t){');
const archiveEnd=html.indexOf('\nfunction archivePage()',archiveStart);
assert(archiveStart>=0&&archiveEnd>archiveStart,'Navigation des phases archivees absente');
const archiveSource=html.slice(archiveStart,archiveEnd);
assert(archiveSource.includes('milftEventRootId(x)===root'),'Archives : regroupement evenement manquant');
assert(archiveSource.includes('!x.abandoned'),'Archives : phase abandonnee proposee');
assert(archiveSource.includes("openTournament("),'Archives : acces aux autres phases absent');
assert(html.slice(archiveEnd,archiveEnd+1400).includes('${milftArchiveLinkedPhases(t)}'),'Archives : navigation non affichee');
console.log('OK archives : navigation vers phases liees sans afficher les phases abandonnees');

/* Regression : phases abandonnees et cloturees ne bloquent pas les joueurs des phases actives. */
const oldPlaying={id:'old-playing',mode:'knockout',sourceId:'root',closed:true,roster:[],matches:[{id:'old',status:'playing',a:'J1',b:'J2'}],tables:[]};
const abandonedPlaying={id:'abandoned-playing',mode:'knockout',sourceId:'root',abandoned:true,roster:[],matches:[{id:'old2',status:'playing',a:'J3',b:'J4'}],tables:[]};
const activePlaying={id:'active-playing',mode:'knockout',sourceId:'root',roster:[],matches:[{id:'now',status:'playing',a:'J5',b:'J6'}],tables:[]};
const rootPlaying={id:'root',mode:'poules',roster:[],matches:[],tables:[]};
context.db.tournaments=[rootPlaying,oldPlaying,abandonedPlaying,activePlaying];
const activeBusy=context.busyPlayers(activePlaying);
assert(!activeBusy.has('J1')&&!activeBusy.has('J3'),'Phases fermees bloquent encore les joueurs');
assert(activeBusy.has('J5')&&activeBusy.has('J6'),'Joueurs actifs non proteges');
console.log('OK joueurs occupes : seules les phases actives bloquent les rencontres');

/* Regression : une phase close ou abandonnee ne peut pas relancer l'attribution. */
const autoSource=extract('autoAssign');
assert(autoSource.includes('if(!t||t.closed||t.abandoned)return;'),'Attribution automatique autorisee sur phase close');
const prioritySource=extract('milftToggleMatchPriority');
assert(prioritySource.includes('t.closed||t.abandoned'),'Priorisation autorisee sur phase abandonnee');
const closedMatch={id:'closed-match',status:'waiting',a:'A',b:'B'};
const closedPhase={id:'closed',closed:true,mode:'poules',roster:[],matches:[closedMatch],tables:[{id:1,state:'free'}]};
context.db.tournaments=[closedPhase];
context.autoAssign(closedPhase);
assert.strictEqual(closedMatch.status,'waiting','Attribution lancee sur une phase close');
closedPhase.closed=false;closedPhase.abandoned=true;
context.autoAssign(closedPhase);
assert.strictEqual(closedMatch.status,'waiting','Attribution lancee sur une phase abandonnee');
console.log('OK phases closes : aucune attribution automatique ni priorisation');

/* Regression fonctionnelle : exclusion ou maintenance sur une phase bloque la table pour toutes. */
const maintenanceRoot={id:'maintenance-root',mode:'poules',roster:[],matches:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]};
const maintenanceA={id:'maintenance-A',sourceId:'maintenance-root',mode:'knockout',roster:[],matches:[match('mA','P1','P2')],tables:[{id:1,state:'free'},{id:2,state:'free'}]};
const maintenanceB={id:'maintenance-B',sourceId:'maintenance-root',mode:'knockout',roster:[],matches:[match('mB','P3','P4',true)],tables:[{id:1,state:'maintenance'},{id:2,state:'free'}]};
context.db.tournaments=[maintenanceRoot,maintenanceA,maintenanceB];
assert.deepStrictEqual(Array.from(context.milftFreeTables(maintenanceA),x=>x.id),[2],'Maintenance B non appliquee a A');
context.autoAssign(maintenanceA);
assert.strictEqual(maintenanceB.matches[0].table,2,'Rencontre prioritaire non affectee sur table autorisee');
assert.strictEqual(maintenanceA.matches[0].status,'waiting','Attribution sur table en maintenance');
maintenanceB.tables[0].state='excluded';
assert.deepStrictEqual(Array.from(context.milftFreeTables(maintenanceRoot),x=>x.id),[],'Table exclue ou occupee proposee');
console.log('OK maintenance et exclusion : partagees entre poules et tableaux A/B');

/* Regression interface : aucun controle actif sur une phase abandonnee. */
const stateHandler=extract('changeTableState');
const priorityButton=extract('milftPriorityButton');
const generalAssign=extract('autoNow');
assert(stateHandler.includes('t.closed||t.abandoned'),'Etat des tables modifiable sur phase abandonnee');
assert(priorityButton.includes('t.closed||t.abandoned'),'Bouton de priorite actif sur phase abandonnee');
assert(generalAssign.includes('t.closed||t.abandoned'),'Attribution generale active sur phase abandonnee');
console.log('OK interface : tables et priorites inactives sur phases abandonnees');

/* Regression : le deplacement manuel doit aussi refuser une phase abandonnee. */
assert(extract('moveMatch').includes('t.closed||t.abandoned'),'Deplacement autorise dans une phase abandonnee');
console.log('OK deplacement manuel interdit sur phase abandonnee');

/* Regression fonctionnelle : plusieurs tables, joueur commun et priorites inter-phases. */
const parallelRoot={id:'parallel-root',mode:'poules',roster:[],matches:[],tables:[1,2,3].map(id=>({id,state:'free'}))};
const parallelA={id:'parallel-A',sourceId:'parallel-root',mode:'knockout',roster:[],matches:[match('A-priority','J1','J2',true),match('A-overlap','J1','J3')],tables:[1,2,3].map(id=>({id,state:'free'}))};
const parallelB={id:'parallel-B',sourceId:'parallel-root',mode:'knockout',roster:[],matches:[match('B-priority','J4','J5',true),match('B-overlap','J2','J6'),match('B-independent','J7','J8')],tables:[1,2,3].map(id=>({id,state:'free'}))};
context.db.tournaments=[parallelRoot,parallelA,parallelB];
context.autoAssign(parallelRoot);
const runningParallel=[...parallelA.matches,...parallelB.matches].filter(m=>m.status==='playing');
assert.strictEqual(runningParallel.length,3,'Trois tables doivent accueillir trois rencontres compatibles');
assert.strictEqual(new Set(runningParallel.map(m=>m.table)).size,3,'Une table attribuee deux fois');
const occupiedParallel=runningParallel.flatMap(m=>[m.a,m.b]);
assert.strictEqual(new Set(occupiedParallel).size,occupiedParallel.length,'Un joueur attribue deux fois');
assert.strictEqual(parallelA.matches[0].status,'playing','Priorite A non respectee');
assert.strictEqual(parallelB.matches[0].status,'playing','Priorite B non respectee');
assert.strictEqual(parallelA.matches[1].status,'waiting','Joueur J1 attribue deux fois');
assert.strictEqual(parallelB.matches[1].status,'waiting','Joueur J2 attribue deux fois');
assert.strictEqual(parallelB.matches[2].status,'playing','Rencontre independante non lancee');
console.log('OK parc multi-tables : trois attributions, priorites A/B, aucun doublon joueur ou table');
