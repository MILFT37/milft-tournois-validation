'use strict';
// MAJ109 : contrôle documentaire et de non-exposition ; aucune requête réseau.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const get=file=>fs.readFileSync(path.join(root,file),'utf8');
const doc=get('docs/MILFT_TOURNOIS_MAJ109_PLAN_HTTPS_EPHEMERE_2026-11-24.md');
for(const term of ['GO spécifique','certificat approuvé','Web Locks','127.0.0.1',
 'Firebase réel','deux comptes Google','test physique réel reste non réalisé',
 'sans activation','aucune action utilisateur','proxy','pas de port ouvert vers Internet']){
 assert(doc.toLowerCase().includes(term.toLowerCase()),'Plan incomplet : '+term);
}
const cfg=JSON.parse(get('firebase.v2.multimatch.emulator.json'));
for(const key of ['auth','database'])assert.equal(cfg.emulators[key].host,'127.0.0.1');
const source=get('v2/mobile-multimatch-emulator.mjs');
assert(source.includes("['127.0.0.1','localhost','::1'].includes(location.hostname)"));
const deployed=get('.github/workflows/milft-pages-deploy.yml');
for(const name of ['mobile-multimatch-emulator.mjs','mobile-multimatch-emulator.html',
 'draft-multimatch-emulator.mjs','outbox-multimatch-emulator.js']){
 assert(!deployed.includes(name),'Fichier de test exposé sur Pages : '+name);
}
console.log('OK MAJ109 : plan de transport HTTPS non activé, isolement Firebase et V1.1 préservés.');
