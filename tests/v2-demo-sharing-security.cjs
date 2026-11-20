'use strict';
// MAJ 71 — Test des règles de salles de démonstration avec l'émulateur RTDB.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const rules=fs.readFileSync('v2/database.rules.json','utf8');
const trialId='trialABCDEFGH1234567';
const base='v2Trials/'+trialId;
const match=(owner='ownerUid')=>({
  version:0,status:'playing',sets:{'0':{a:5,b:3}},
  updatedBy:owner,lastEventId:'seed',lastEventFingerprint:'seed'
});
const trial={ownerUid:'ownerUid',demoOnly:true,createdAt:Date.now(),matches:{demo:match()}};
const update=(uid,version,id,score)=>({
  version,status:'playing',sets:{'0':score},updatedBy:uid,
  lastEventId:id,lastEventFingerprint:'fingerprint'+id
});
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-milft-v2-70',database:{host:'127.0.0.1',port:9000,rules}});
 try{
  await env.clearDatabase();
  const as=uid=>env.authenticatedContext(uid).database();
  const owner=as('ownerUid'),editor=as('android2Uid'),viewer=as('viewerUid'),outsider=as('outsiderUid');
  const anonymous=env.unauthenticatedContext().database();
  const tid='trialOtherABCDEFG12345';
  await assertFails(anonymous.ref(base).set(trial),'Anonymous cannot create');
  await assertFails(editor.ref(base).set(trial),'Nonowner cannot forge owner');
  await assertFails(owner.ref(base).set({...trial,demoOnly:false}),'Real data cannot be enrolled in demo');
  await assertFails(owner.ref(base).set({...trial,members:{outsiderUid:'admin'}}),'Owner cannot auto-grant other accounts at creation');
  await assertFails(owner.ref(base).set({...trial,privateRoster:{a:'real user'}}),'No unknown or real roster data');
  await assertFails(owner.ref(base).set({...trial,matches:{demo:{...match(),sets:{'0':{a:-1,b:3}}}}}),'No invalid score at creation');
  await assertSucceeds(owner.ref(base).set(trial));
  await assertFails(owner.ref(base).set({...trial,createdAt:Date.now()+1}),'No whole tournament overwrite');
  await assertSucceeds(owner.ref(base+'/matches/demo').once('value'));
  await assertFails(outsider.ref(base+'/matches/demo').once('value'));
  await assertFails(anonymous.ref(base+'/matches/demo').once('value'));
  await assertFails(outsider.ref(base+'/ownerUid').once('value'));
  await assertFails(owner.ref(base).once('value'),'No broad access to member details');
  await assertFails(owner.ref(base+'/members/ownerUid').set('editor'),'Cannot downgrade owner into member');
  await assertFails(editor.ref(base+'/members/android2Uid').set('admin'),'Cannot self-grant');
  await assertSucceeds(owner.ref(base+'/members/android2Uid').set('editor'));
  await assertSucceeds(owner.ref(base+'/members/viewerUid').set('viewer'));
  await assertFails(owner.ref(base+'/members/android2Uid').set('admin'),'Only viewer/editor');
  assert.equal((await assertSucceeds(editor.ref(base+'/members/android2Uid').once('value'))).val(),'editor');
  await assertFails(editor.ref(base+'/members/viewerUid').once('value'),'No reading another invite');
  await assertSucceeds(editor.ref(base+'/matches/demo').once('value'));
  await assertSucceeds(viewer.ref(base+'/matches/demo').once('value'));
  const v1=update('ownerUid',1,'e1',{a:5,b:4});
  await assertSucceeds(owner.ref(base+'/matches/demo').set(v1));
  await assertFails(viewer.ref(base+'/matches/demo').set(update('viewerUid',2,'eview',{a:5,b:5})),'Read only');
  await assertFails(editor.ref(base+'/matches/demo').set(update('android2Uid',1,'stale',{a:5,b:5})),'Stale write');
  await assertFails(editor.ref(base+'/matches/demo/sets/0/a').set(10),'No nested patch bypass');
  await assertFails(editor.ref(base+'/matches/demo').set({...update('android2Uid',2,'e2',{a:5,b:5}),privateData:42}),'No unknown fields');
  const v2=update('android2Uid',2,'e2',{a:5,b:5});
  await assertSucceeds(editor.ref(base+'/matches/demo').set(v2));
  assert.equal((await assertSucceeds(owner.ref(base+'/matches/demo/version').once('value'))).val(),2);
  await assertFails(editor.ref(base+'/matches/new').set(v2),'Cannot create arbitrary match');
  await assertFails(editor.ref('v2Trials/'+tid+'/matches/demo').once('value'),'No other tournament');
  await assertFails(editor.ref(base+'/members/outsiderUid').set('editor'),'Cannot grant outsiders');
  await assertSucceeds(owner.ref(base+'/members/android2Uid').remove());
  await assertFails(editor.ref(base+'/matches/demo').once('value'),'Revoke takes effect');
  await assertFails(editor.ref(base+'/matches/demo').set(update('android2Uid',3,'e3',{a:5,b:6})),'Revoked cannot write');
  assert.equal((await assertSucceeds(owner.ref(base+'/matches/demo').once('value'))).val().version,2);
  console.log('OK MAJ71 Firebase Emulator: create, invite, live roles, revocation, stale scores, no-wide-read, no unauthorized writes, different Android accounts');
 }finally{await env.cleanup()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
