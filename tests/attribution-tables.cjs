const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim()&&!/\bsrc=/.test(s));
for(const [i,source] of scripts.entries()){new vm.Script(source,{filename:'inline-'+i+'.js'});}
const checks={
 'attribution apres resultat':/if\(t\.mode==='knockout'\)advanceKnockout\(t\);\s*autoAssign\(t\);/.test(html),
 'attribution apres forfait':/autoAssign\(t\);\s*save\(\);flash\('Forfait enregistré/.test(html),
 'report bloque avant reattribution':/m\.hold=true;autoAssign\(t\);save\(\);flash\('Rencontre reportée/.test(html),
 'reprise declenche attribution':/if\(!m\.hold\)autoAssign\(t\);save\(\);render\(\)/.test(html),
 'deplacement libere et attribue':/next\.state='playing';autoAssign\(t\);save\(\);flash\('Match déplacé/.test(html),
 'priorite dans file':/eligible\.sort\(\(a,b\)=>\(Number\(!!b\.milftPriority\)-Number\(!!a\.milftPriority\)\)/.test(html)
};
for(const [name,ok] of Object.entries(checks)){console.log((ok?'OK ':'ECHEC ')+name);assert(ok,name);}
console.log('OK syntaxe de '+scripts.length+' scripts embarques; '+Object.keys(checks).length+' controles statiques.');
const fair=html.match(/function milftFairNextMatch\(t,busy\)\{[\s\S]*?(?=\nfunction milftToggleMatchPriority\()/);
const assign=html.match(/function autoAssign\(t\)\{[^\n]*\}/);
assert(fair&&assign,'Fonctions de planification introuvables');
const context={matchPlayerIds:(t,m)=>[m.a,m.b],busyPlayers:t=>new Set(t.matches.filter(m=>m.status==='playing').flatMap(m=>[m.a,m.b])),milftFreeTables:t=>t.tables.filter(x=>x.state==='free'),Date};
vm.createContext(context);
vm.runInContext(fair[0]+'\n'+assign[0],context);
const match=(id,a,b,priority=false,hold=false)=>({id,a,b,status:'waiting',round:1,milftPriority:priority,hold});
const t={mode:'poules',currentRound:1,roundLimit:2,matches:[match('normal','A','B'),match('prioritaire','C','D',true),match('reporte','E','F',true,true)],tables:[{id:1,state:'free'}]};
context.autoAssign(t);
assert.strictEqual(t.matches[1].status,'playing','La rencontre prioritaire doit demarrer');
assert.strictEqual(t.matches[2].status,'waiting','Une rencontre reportee ne doit pas demarrer');
assert.strictEqual(t.matches[0].status,'waiting','Une seule table ne doit lancer qu un match');
t.tables[0].state='free';t.matches[1].status='done';
context.autoAssign(t);
assert.strictEqual(t.matches[0].status,'playing','La table liberee doit etre reutilisee');
console.log('OK tests fonctionnels : priorite, report, reattribution, capacite table');
