'use strict';
// MAJ70: tests UNIQUEMENT contre Firebase Realtime Database Emulator, jamais production.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const rules=fs.readFileSync('v2/database.rules.json','utf8');
const seedMatch=()=>({version:0,status:'playing',sets:{'0':{a:5,b:3}},updatedBy:'seed',lastEventId:'seed',lastEventFingerprint:'seed'});
const data={tournaments:{
 clubA:{members:{samsungUid:'admin',android2Uid:'editor',guestUid:'viewer'},matches:{m1:seedMatch(),m2:seedMatch()},tables:{table1:{version:0,matchId:null}}},
 clubB:{members:{android2Uid:'viewer'},matches:{m1:seedMatch()},tables:{table1:{version:0,matchId:null}}}
}};
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-milft-v2-70',database:{host:'127.0.0.1',port:9000,rules}});
 try{
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async context=>context.database().ref('/').set(data));
  const samsung=env.authenticatedContext('samsungUid').database();
  const android=env.authenticatedContext('android2Uid').database();
  const guest=env.authenticatedContext('guestUid').database();
  const stranger=env.authenticatedContext('strangerUid').database();
  const anon=env.unauthenticatedContext().database();
  const p='tournaments/clubA/matches/m1';
  assert.equal((await assertSucceeds(samsung.ref(p).once('value'))).val().version,0);
  assert.equal((await assertSucceeds(android.ref(p).once('value'))).val().version,0);
  await assertSucceeds(guest.ref(p).once('value'));
  await assertFails(stranger.ref(p).once('value'));
  await assertFails(anon.ref(p).once('value'));
  await assertFails(anon.ref('tournaments/clubA/tables').once('value'));
  await assertFails(samsung.ref('tournaments/clubA').once('value'),'No wide read of tournament metadata');
  await assertSucceeds(samsung.ref('tournaments/clubA/members/samsungUid').once('value'));
  await assertFails(samsung.ref('tournaments/clubA/members/android2Uid').once('value'));
  const base=seedMatch(),next={...base,version:1,sets:{'0':{a:5,b:4}},updatedBy:'samsungUid',lastEventId:'event1',lastEventFingerprint:'fingerprint1'};
  await assertSucceeds(samsung.ref(p).set(next));
  await assertFails(android.ref(p).set({...next,updatedBy:'android2Uid',lastEventId:'event2',lastEventFingerprint:'fp2'}),'Stale score overwrite blocked');
  await assertFails(guest.ref(p).set({...next,version:2,updatedBy:'guestUid',lastEventId:'event3',lastEventFingerprint:'fp3'}));
  await assertFails(stranger.ref(p).set({...next,version:2,updatedBy:'strangerUid'}));
  await assertFails(anon.ref(p).set({...next,version:2,updatedBy:'anon'}));
  await assertFails(android.ref('tournaments/clubB/matches/m1').set({...next,updatedBy:'android2Uid'}),'Tournament role isolated');
  await assertFails(samsung.ref(p+'/sets/0/a').set(8),'Child field edit bypass must be refused');
  await assertFails(samsung.ref(p).set(null),'No delete');
  await assertFails(samsung.ref('tournaments/clubA/members/guestUid').set('admin'),'No role escalation');
  await assertFails(samsung.ref('tournaments/clubA/matches/newMatch').set(next),'No client creation');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',status:'done'}),'Client cannot finalize or overwrite stage');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',sets:{'0':{a:-1,b:3}}}),'Negative score denied');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',sets:{'0':{a:5.5,b:3}}}),'Non-integer score denied');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',sets:{'5':{a:5,b:3}}}),'Invalid set index denied');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',injected:true}),'Unknown match fields denied');
  await assertFails(samsung.ref(p).set({...next,version:2,updatedBy:'samsungUid',lastEventId:'event4',sets:{'0':{a:5,b:3,extra:9}}}),'Unknown set fields denied');
  const updated={...next,version:2,updatedBy:'android2Uid',lastEventId:'event5',lastEventFingerprint:'fingerprint5',sets:{'0':{a:5,b:5}}};
  await assertSucceeds(android.ref(p).set(updated));
  assert.equal((await assertSucceeds(samsung.ref(p).once('value'))).val().version,2);
  assert.equal((await assertSucceeds(android.ref(p).once('value'))).val().sets['0'].b,5);
  await assertSucceeds(guest.ref('tournaments/clubA/tables').once('value'));
  await assertFails(guest.ref('tournaments/clubA/tables/table1').set({version:1,matchId:'m1'}));
  console.log('OK V2 MAJ70 Firebase RTDB emulator: authenticated Samsung->Android, cross-tournament, viewers, stale overwrite, nested bypass, no role escalation, schema and input checks');
 }finally{await env.cleanup()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
