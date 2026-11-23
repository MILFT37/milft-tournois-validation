'use strict';
// MAJ93 — candidat multi-match : tests UNIQUEMENT contre l'émulateur RTDB.
// Aucun accès à un compte Firebase réel, au Drive, ni à la V1.1.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const candidate=JSON.parse(fs.readFileSync('v2/database.rules.multimatch-candidate.emulator.json','utf8'));
const published=JSON.parse(fs.readFileSync('v2/database.rules.console-v2-only.json','utf8'));
const publishedExtended=JSON.parse(fs.readFileSync('v2/database.rules.json','utf8'));
assert.equal(candidate.rules['.read'],false);
assert.equal(candidate.rules['.write'],false);
assert.equal(candidate.rules.tournaments,undefined,'Candidate must not expose official tournaments');
assert.deepEqual(published.rules.v2Trials,publishedExtended.rules.v2Trials,
 'Published compact rules must match current committed V2 rules');
// All paths except the match-node wildcard must remain byte-for-byte equivalent
// after structural normalization: only $mid write/validation is new.
const expected=JSON.parse(JSON.stringify(published));
const candidateMatch=JSON.parse(JSON.stringify(candidate.rules.v2Trials.$tid.matches.$mid));
const oldDemo=JSON.parse(JSON.stringify(expected.rules.v2Trials.$tid.matches.demo));
delete expected.rules.v2Trials.$tid.matches.demo;
// RTDB n'autorise qu'un seul joker de nom : l'ancien $other est absorbé
// par $mid et son contrôle strict d'identifiant/validation.
delete expected.rules.v2Trials.$tid.matches.$other;
expected.rules.v2Trials.$tid.matches.$mid=candidateMatch;
assert.deepEqual(candidate,expected,'Candidate may modify only the isolated match branch');
for(const [key,val] of Object.entries(oldDemo)){
 if(key!=='.write'&&key!=='.validate')
  assert.deepEqual(candidateMatch[key],val,'Existing match field validation must remain unchanged: '+key);
}
const id='trial93abcdef1234567890', otherId='trial93otherabcdef123456';
const seed=uid=>({version:0,status:'playing',sets:{'0':{a:0,b:0}},updatedBy:uid,
 lastEventId:'seed',lastEventFingerprint:'seed'});
const update=(state,uid,eventId,a,b)=>({...state,version:state.version+1,
 sets:{...state.sets,'0':{a,b}},updatedBy:uid,lastEventId:eventId,lastEventFingerprint:'fp_'+eventId});
const trial=uid=>({ownerUid:uid,demoOnly:true,createdAt:Date.now(),
 matches:{demo:seed(uid)}});
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-milft-v2-93',
  database:{host:'127.0.0.1',port:9000,rules:JSON.stringify(candidate)}});
 try{
  await env.clearDatabase();
  const owner=env.authenticatedContext('owner93').database();
  const editor=env.authenticatedContext('editor93').database();
  const viewer=env.authenticatedContext('viewer93').database();
  const stranger=env.authenticatedContext('stranger93').database();
  const anon=env.unauthenticatedContext().database();
  const root='v2Trials/'+id,otherRoot='v2Trials/'+otherId;
  const a=root+'/matches/demo',b=root+'/matches/courtB';
  await assertFails(anon.ref(root).set(trial('owner93')),'Unauthenticated create');
  await assertFails(stranger.ref(root).set(trial('owner93')),'Other user cannot impersonate owner');
  await assertSucceeds(owner.ref(root).set(trial('owner93')));
  await assertFails(owner.ref(root).set(trial('owner93')),'Existing trial cannot be replaced');
  await assertFails(anon.ref(a).once('value'));
  await assertFails(stranger.ref(a).once('value'));
  await assertFails(stranger.ref(b).once('value'));
  await assertFails(owner.ref(root).once('value'),'No broad room read');
  await assertFails(owner.ref('v2Trials').once('value'),'No room enumeration');
  await assertFails(owner.ref('tournaments').once('value'),'No real tournaments visible');
  await assertFails(owner.ref(root+'/matches/courtB').set(null),'No creation-as-delete');
  await assertFails(editor.ref(b).set(seed('editor93')),'Editor cannot create a match');
  await assertFails(viewer.ref(b).set(seed('viewer93')),'Viewer cannot create');
  await assertFails(stranger.ref(b).set(seed('stranger93')));
  await assertFails(owner.ref(root+'/matches/match é').set(seed('owner93')),'Invalid match ID');
  await assertFails(owner.ref(b).set({...seed('owner93'),version:1}),'Seed must have version 0');
  await assertFails(owner.ref(b).set({...seed('owner93'),status:'done'}),'Seed must be playing');
  await assertFails(owner.ref(b).set({...seed('owner93'),sets:{'0':{a:5,b:3}}}),'No unconfirmed score injection at seed');
  await assertFails(owner.ref(b).set({...seed('owner93'),updatedBy:'editor93'}),'Seed author spoofing');
  await assertFails(owner.ref(b).set({...seed('owner93'),lastEventId:'malicious'}),'Seed must use seed event');
  await assertFails(owner.ref(b).set({...seed('owner93'),unexpected:true}),'Seed unknown field');
  await assertSucceeds(owner.ref(b).set(seed('owner93')));
  assert.equal((await assertSucceeds(owner.ref(b).once('value'))).val().version,0);
  await assertFails(editor.ref(b).once('value'),'Uninvited editor cannot read');
  await assertSucceeds(owner.ref(root+'/members/editor93').set('editor'));
  await assertSucceeds(owner.ref(root+'/members/viewer93').set('viewer'));
  await assertSucceeds(editor.ref(b).once('value'));
  await assertSucceeds(viewer.ref(a).once('value'));
  await assertSucceeds(viewer.ref(b).once('value'));
  await assertFails(viewer.ref(b).set(update(seed('owner93'),'viewer93','evtViewer',1,1)));
  await assertFails(editor.ref(root+'/members/viewer93').set('editor'),'No role escalation');
  await assertFails(editor.ref(b+'/sets/0/a').set(99),'No partial-write bypass');
  await assertFails(owner.ref(a).set(null),'No deletion');
  await assertFails(owner.ref(root+'/matches').set({}),'No whole-map delete');
  const b1=update(seed('owner93'),'editor93','evtB1',5,3);
  const a1=update(seed('owner93'),'owner93','evtA1',4,2);
  await Promise.all([
   assertSucceeds(editor.ref(b).set(b1)),
   assertSucceeds(owner.ref(a).set(a1))
  ]);
  assert.equal((await assertSucceeds(editor.ref(b).once('value'))).val().version,1);
  assert.equal((await assertSucceeds(owner.ref(a).once('value'))).val().version,1);
  await assertFails(owner.ref(b).set(update(seed('owner93'),'owner93','evtBstale',9,9)),
   'Stale same-match score cannot overwrite');
  await assertFails(editor.ref(a).set(update(seed('owner93'),'editor93','evtAstale',4,2)),
   'Same score with stale version cannot rewrite (client-side receipt only)');
  await assertFails(viewer.ref(b).set(update(b1,'viewer93','evtVB',6,4)));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD',6,4),sets:{'0':{a:-1,b:4}}}));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD2',6,4),sets:{'0':{a:5.5,b:4}}}));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD3',6,4),sets:{'0':{a:5,b:100}}}));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD4',6,4),sets:{'0':{a:6,b:4,extra:1}}}));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD5',6,4),status:'done'}));
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtBAD6',6,4),injected:'bad'}));
  await assertFails(editor.ref(b).set({...update(b1,'owner93','evtBAD7',6,4)}),'No author impersonation');
  await assertFails(editor.ref(b).set({...update(b1,'editor93','evtB1',6,4)}),'Event ID must change');
  const b2=update(b1,'owner93','evtB2',6,4);
  await assertSucceeds(owner.ref(b).set(b2));
  assert.equal((await assertSucceeds(editor.ref(a).once('value'))).val().version,1,'Other match remains unaffected');
  const a2=update(a1,'editor93','evtA2',7,5);
  await assertSucceeds(editor.ref(a).set(a2));
  assert.equal((await assertSucceeds(viewer.ref(a).once('value'))).val().version,2);
  assert.equal((await assertSucceeds(viewer.ref(b).once('value'))).val().version,2);
  await assertSucceeds(owner.ref(root+'/members/editor93').set('viewer'));
  await assertFails(editor.ref(a).set(update(a2,'editor93','evtA3',8,5)),
   'Downgraded editor must be read-only');
  await assertSucceeds(editor.ref(b).once('value'));
  await assertSucceeds(owner.ref(root+'/members/editor93').set('editor'));
  const b3=update(b2,'editor93','evtB3',6,5);
  await assertSucceeds(editor.ref(b).set(b3));
  await assertSucceeds(owner.ref(root+'/members/editor93').remove());
  await assertFails(editor.ref(b).once('value'),'Revoked account must not see the match');
  await assertFails(editor.ref(b).set(update(b3,'editor93','evtB4',7,5)),
    'Revoked account cannot write');
  // A second room must never leak rights or match data.
  await assertSucceeds(stranger.ref(otherRoot).set(trial('stranger93')));
  await assertFails(owner.ref(otherRoot+'/matches/demo').once('value'));
  await assertFails(stranger.ref(a).once('value'));
  const lastA=(await assertSucceeds(owner.ref(a).once('value'))).val();
  const lastB=(await assertSucceeds(owner.ref(b).once('value'))).val();
  assert.equal(lastA.version,2);assert.equal(lastB.version,3);
  assert.deepEqual(lastA.sets['0'],{a:7,b:5});
  assert.deepEqual(lastB.sets['0'],{a:6,b:5});
  console.log('OK V2 MAJ93 EMULATOR: candidate multi-match create by owner, concurrent independent scores, strictly per-match version, viewer/editor/revoke, isolated rooms, invalid writes blocked');
 }finally{await env.cleanup()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
