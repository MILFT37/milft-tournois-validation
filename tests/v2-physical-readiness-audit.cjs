'use strict';
// MILFT Tournois V2 MAJ107 — audit de préparation sans réseau ni compte réel.
// Il doit ÉCHOUER si le prototype émulé se retrouve exposé ou publié par mégarde.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const check=(name,fn)=>{fn();process.stdout.write('OK MAJ107 — '+name+'\n');};
check('Auth et RTDB Emulator strictement en loopback',()=>{
 const cfg=JSON.parse(read('firebase.v2.multimatch.emulator.json'));
 assert.equal(cfg.database.rules,'v2/database.rules.multimatch-candidate.emulator.json');
 for(const service of ['auth','database']){
  assert.equal(cfg.emulators?.[service]?.host,'127.0.0.1',service+' must stay local');
  assert(Number.isSafeInteger(cfg.emulators?.[service]?.port));
 }
 assert.equal(cfg.emulators?.ui?.enabled,false);
});
check('Interface multi-match inaccessible depuis une URL publique',()=>{
 const source=read('v2/mobile-multimatch-emulator.mjs');
 assert(source.includes("['127.0.0.1','localhost','::1'].includes(location.hostname)"),
  'Missing loopback-only guard');
 assert(source.includes("import('./multimatch-emulator-sdk-test-only.mjs')"));
 assert(source.includes("import {firebaseConfig} from './multimatch-emulator-config-test-only.mjs'"));
 assert(!fs.existsSync(path.join(root,'v2/multimatch-emulator-sdk-test-only.mjs')),
  'Test SDK must be injected only by the local E2E server');
 assert(!fs.existsSync(path.join(root,'v2/multimatch-emulator-config-test-only.mjs')),
  'Test config must be injected only by the local E2E server');
 assert(!source.includes('v2/firebase-config.mjs'),'Do not import the separate public Firebase V2 config');
});
check('Test E2E avec identités anonymes ém ulées, pas de vrais comptes Google'.replace(' ém ulées',' émulées'),()=>{
 const e2e=read('tests/v2-mobile-multimatch-emulator-e2e.cjs');
 assert(e2e.includes("const projectId='demo-milft-v2-94'"));
 assert(e2e.includes("signInAnonymously(auth)"),'Google login must remain mocked in Emulator');
 assert(e2e.includes("export class GoogleAuthProvider {}"),'Google provider must be stubbed');
 assert(e2e.includes('uidMobile!==uidPc'),'Distinct simulated identities are required');
 assert(e2e.includes("await context.route('**/*'"),'All browser requests need an allowlist');
 assert(e2e.includes("return route.abort()"),'Unknown network requests must be blocked');
 assert(e2e.includes("'/v2/mobile-multimatch-emulator.html'"));
 assert(e2e.includes("'/v2/outbox-multimatch-emulator.js'"));
});
check('Aucune publication du prototype multi-match via GitHub Pages',()=>{
 const deploy=read('.github/workflows/milft-pages-deploy.yml');
 const forbidden=['mobile-multimatch-emulator.html','mobile-multimatch-emulator.mjs',
  'outbox-multimatch-emulator.js','draft-multimatch-emulator.mjs',
  'multimatch-emulator-sdk-test-only.mjs','multimatch-emulator-config-test-only.mjs',
  'database.rules.multimatch-candidate.emulator.json'];
 for(const name of forbidden)assert(!deploy.includes(name),'Pages workflow references a restricted file: '+name);
});
check('Aucune commande de déploiement Firebase dans les workflows emulés',()=>{
 for(const name of ['.github/workflows/v2-mobile-multimatch-emulator.yml',
  '.github/workflows/v2-multimatch-candidate.yml']){
  const yml=read(name);
  assert(yml.includes('emulators:exec'),'Only Emulator test commands are permitted: '+name);
  assert(!/firebase\s+(?:deploy|database:(?:set|update|remove)|hosting:channel:deploy)/i.test(yml),
   'Real Firebase action detected: '+name);
 }
});
check('Checklist physique créée avec autorisation préalable obligatoire',()=>{
 const d=read('docs/MILFT_TOURNOIS_MAJ107_PREPARATION_TEST_PHYSIQUE_2026-11-24.md');
 for(const required of ['GO spécifique','deux comptes Google distincts',
  'compte invité','mode lecture seule','Firebase réel','V1.1','archives Drive',
  'test non réalisé','séparé de la production']){
  assert(d.includes(required),'Physical test document missing: '+required);
 }
});
console.log('MAJ107 : prérequis d’isolement conformes. TEST PHYSIQUE NON RÉALISÉ, ACCÈS RÉEL NON AUTORISÉ.');
