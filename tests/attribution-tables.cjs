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