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
vm.runInContext(['busyPlayers','milftAnnualNextMatch','milftFairNextMatch','milftFreeTables','autoAssign'].map(extract).join('\n'),context);
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
const freeFn=html.match(/function milftFreeTables\(t\)\{[^\n]*\}/);
assert(busyFn&&freeFn,'Fonctions de protection inter-tableaux introuvables');
const sharedDb={tournaments:[
 {id:'poules',mode:'poules',matches:[],roster:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]},
 {id:'A',sourceId:'poules',mode:'knockout',matches:[{status:'playing',a:'J1',b:'J2',table:1}],roster:[],tables:[{id:1,state:'playing'},{id:2,state:'free'}]},
 {id:'B',sourceId:'poules',mode:'knockout',matches:[],roster:[],tables:[{id:1,state:'free'},{id:2,state:'free'}]}
]};
const linked=new Function('db','matchPlayerIds',busyFn[0]+'\n'+freeFn[0]+'\nreturn {busyPlayers,milftFreeTables}')(sharedDb,(t,m)=>[m.a,m.b]);
assert.deepStrictEqual(linked.milftFreeTables(sharedDb.tournaments[2]).map(x=>x.id),[2],'La table 1 est deja occupee par A');
assert(linked.busyPlayers(sharedDb.tournaments[2]).has('J1'),'Joueur de A non protege dans B');
console.log('OK protections inter-tableaux : tables et joueurs occupes');
