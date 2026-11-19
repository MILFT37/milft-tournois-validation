'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const a=fs.readFileSync('MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html','utf8').split('\n');
const b=fs.readFileSync('candidate-production-v11/MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html','utf8').split('\n');
// The legacy validation Drive adapter starts AFTER the shared tournament engine.
// The candidate deliberately replaces it with the independently tested Drive module.
assert.equal(a[3222],'</script><script>','Validation engine boundary changed: review required');
assert.match(b[3222],/^<\/script><script src="https:\/\/accounts\.google\.com\/gsi\/client"/,'Candidate engine boundary changed');
const expected=new Map([
 [0,[['<title>MILFT Tournois — V1.1 — VALIDATION</title>','<title>MILFT Tournois — V1.1</title>'],['href="./manifest.webmanifest"','href="./manifest.production.webmanifest"']]],
 [841,[["milft_iso_20261102_tournois_v01","milft_prod_v11_20261117_tournois_v01"]]],
 [2022,[["MILFT_ISO_20261102_SECOURS","MILFT_PROD_V11_20261117_SECOURS"]]],
 [2354,[["milft_iso_20261102_ui_theme","milft_prod_v11_20261117_ui_theme"]]],
 [2385,[["milft_iso_20261102_planning_v066","milft_prod_v11_20261117_planning_v066"]]],
 [2419,[["milft_iso_20261102_progress_v069","milft_prod_v11_20261117_progress_v069"]]],
 [3144,[["MILFT_ISO_20261102_SECOURS","MILFT_PROD_V11_20261117_SECOURS"]]]
]);
assert(a.length>=3223&&b.length>=3223,'Complete tournament engines required');
let approved=0;
for(let i=0;i<3222;i++){
  let line=a[i];
  for(const [oldValue,newValue] of expected.get(i)||[]){
    assert(line.includes(oldValue),'Approved source difference vanished at line '+(i+1));
    line=line.replace(oldValue,newValue);
    approved++;
  }
  assert.equal(b[i],line,'Unexpected tournament/visual drift at engine line '+(i+1));
}
assert.equal(approved,8,'Only storage keys, page title and manifest may differ');
const shared=b.slice(0,3222).join('\n');
assert(shared.includes('id="milft-drive-brief"'),'Dynamic compact Drive indicator must exist');
assert(shared.includes('id="milft-local-brief"')&&shared.includes('id="milft-auto-brief"'),'Local and auto labels must exist');
assert(!shared.includes('SAUVEGARDE LOCALE ACTIVE • Google Drive facultatif'),'Oversized yellow static banner removed');
assert(!shared.includes('Google Drive désactivé'),'No obsolete Drive warning in production candidate UI');
assert(!shared.includes('drive.appdata'),'No obsolete appdata text in production candidate UI');
assert(!shared.includes('MILFT_ISO_20261102_SECOURS'),'Production IndexedDB backup must remain isolated');
assert(!shared.includes("const KEY='milft_iso_20261102_tournois_v01'"),'Production local state must remain isolated');
assert(shared.includes('<small>Gestion des tournois de football de table</small>'),'General subtitle must be shown in production');
assert(shared.includes('<span class="pill">MILFT Tournois V1.1</span>'),'Correct version badge on official app');
assert(!shared.includes('V1.1 CHAMPIONNAT SIMPLE'),'Old specific badge must be absent');
assert(!shared.includes('Gestion de tournois • championnat annuel Simple'),'Old specific subtitle must be absent');
console.log('OK full tournament-engine/visual parity: 3,222 identical lines except 8 approved edits; separate Drive adapters and storage retained');
