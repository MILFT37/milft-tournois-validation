/* Production readiness: pure static verification. No deployment and no user data. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path'),crypto=require('node:crypto');
const from='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const to='MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html';
const normalizeCheckout=text=>text.replace(/\r\n/g,'\n');
const base=normalizeCheckout(fs.readFileSync(from,'utf8'));
const release=normalizeCheckout(fs.readFileSync(to,'utf8'));
const blobSha=text=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
assert.equal(blobSha(base),'53c54113726796ac2edd0189f7c0d5bf51308bf8',
  'Le code fonctionnel de référence a changé : ne pas dériver de release silencieusement');
const values=[
 ['milft_iso_20261102_tournois_v01','milft_prod_v11_20261117_tournois_v01',1],
 ['milft_iso_20261102_ui_theme','milft_prod_v11_20261117_ui_theme',1],
 ['milft_iso_20261102_planning_v066','milft_prod_v11_20261117_planning_v066',1],
 ['milft_iso_20261102_progress_v069','milft_prod_v11_20261117_progress_v069',1],
 ['MILFT_ISO_20261102_SECOURS','MILFT_PROD_V11_20261117_SECOURS',2],
 ['<title>MILFT Tournois — V1.1 — VALIDATION</title>','<title>MILFT Tournois — V1.1</title>',1],
 ['<link rel="manifest" href="./manifest.webmanifest">','<link rel="manifest" href="./manifest.production.webmanifest">',1]
];
let expected=base;
for(const [oldValue,newValue,num] of values){
 assert.equal(expected.split(oldValue).length-1,num,'Occurrences source '+oldValue);
 expected=expected.split(oldValue).join(newValue);
 assert.equal(release.split(newValue).length-1,num,'Occurrences release '+newValue);
}
// La seule différence fonctionnelle autorisée : suppression de l'amorçage nominatif.
const first=expected.indexOf('const MILFT_JOUEURS_REFERENCE_20261014=');
const last=expected.indexOf('})();',first)+5;
assert(first>=0&&last>first,'Amorçage nominatif de référence introuvable');
const oldSeed=expected.slice(first,last);
assert(oldSeed.includes('db.players.push(')&&oldSeed.includes('localStorage.setItem(KEY'), 'Bloc nominatif inattendu');
expected=expected.slice(0,first)+
// Keep the exact comment from the corrected release, without exposing any names.
 '// Aucun joueur préchargé dans le code public. Profils existants conservés en stockage local ; import JSON privé possible.\n'+
 expected.slice(last);
assert.equal(release,expected,
 'Production et validation divergent hors isolation/nom/manifeste et retrait nominatif : revue obligatoire');
assert(!release.includes('MILFT_JOUEURS_REFERENCE_20261014'));
assert(!release.includes('integrateReferencePlayers'));
assert(!release.includes('milft_excel_20261014_'));
assert(!release.includes('milft_iso_20261102_'),'Anciennes clés locales encore référencées');
assert(!release.includes('MILFT_ISO_20261102_SECOURS'),'Ancien stockage IndexedDB encore référencé');
assert(release.includes('function milftBackupPreviewGroups('),'Aperçu métier absent');
assert(release.includes('async function milftImportBackup('),'Importeur absent');
assert(release.includes('Sauvegarde importée : '),'Notification de restauration absente');
const manifest=JSON.parse(fs.readFileSync('manifest.production.webmanifest','utf8'));
assert.equal(manifest.start_url,'./'+to,'Manifeste démarrant sur un ancien HTML');
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'./');
for(const icon of manifest.icons){
 const file=path.join('.',icon.src);
 const bytes=fs.readFileSync(file);
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),file+' n’est pas un PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 const expected=Number(icon.sizes.split('x')[0]);
 assert.deepEqual([width,height],[expected,expected],file+' dimensions invalides');
}
assert(release.includes('<link rel="apple-touch-icon"'),'Icône Apple absente');
const index=fs.readFileSync('index.production.html','utf8');
assert(index.includes('http-equiv="refresh"'),'La page d’entrée production doit rediriger');
assert(index.includes('./'+to),'La page d’entrée pointe vers un fichier différent de la release');
assert(!index.includes('VALIDATION_HEBERGEMENT'),'La page d’entrée pointe vers la validation');

console.log('OK release : identité fonctionnelle hors 5 clés, titre, manifeste et suppression de l amorçage nominatif');
console.log('OK release : clés de production distinctes, manifest PWA et icônes vérifiés');
console.log('Blob release : '+blobSha(release));
console.log('LIMITE : cette validation ne transfère aucun JSON réel et ne déploie pas la production');
