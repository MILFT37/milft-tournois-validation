'use strict';
// MAJ70 : deux clients mobiles fictifs traversent le VRAI moteur transactionnel RTDB émulé.
// Aucun service Firebase réel ni aucune donnée utilisateur n'est contacté.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds}=require('@firebase/rules-unit-testing');
const {createTransport}=require('../v2/firebase-match-transport.cjs');
function sdk(){
 return {
  ref(db,path){return db.ref(path)},
  runTransaction(ref,fn){return ref.transaction(fn,undefined,false)},
  onValue(ref,onData,onError){ref.on('value',onData,onError);return ()=>ref.off('value',onData)}
 };
}
function command(id,actorId,deviceId,expectedVersion,goals){
 return {id,tournamentId:'clubA',matchId:'m1',actorId,deviceId,type:'set.record',expectedVersion,setIndex:0,goals};
}
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-milft-v2-70',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync('v2/database.rules.json','utf8')}});
 try{
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async ctx=>ctx.database().ref('/tournaments/clubA').set({
   members:{samsungUid:'admin',android2Uid:'editor',viewerUid:'viewer'},
   matches:{m1:{version:0,status:'playing',sets:{'0':{a:5,b:3}},updatedBy:'seed',lastEventId:'seed',lastEventFingerprint:'seed'}}
  }));
  const user=uid=>{
    const db=env.authenticatedContext(uid).database();
    return {db,transport:createTransport({database:db,auth:{currentUser:{uid}},sdk:sdk()})};
  };
  const samsung=user('samsungUid'),android=user('android2Uid');
  const first=command('m1-a','samsungUid','galaxy-s25',0,{a:5,b:4});
  const second=command('m1-b','android2Uid','another-android',0,{a:5,b:5});
  const [a,b]=await Promise.all([samsung.transport.execute(first),android.transport.execute(second)]);
  assert.deepEqual([a.status,b.status].sort(),['applied','conflict'],JSON.stringify({a,b}));
  const server=(await assertSucceeds(samsung.db.ref('tournaments/clubA/matches/m1').once('value'))).val();
  const winner=a.status==='applied'?first:second;
  assert.equal(server.version,1);assert.equal(server.lastEventId,winner.id);
  assert.deepEqual(server.sets['0'],winner.goals,'No old score overwrite');
  const repeating=a.status==='applied'?samsung:android;
  assert.equal((await repeating.transport.execute(winner)).status,'duplicate','Server confirmed idempotency');
  const loser=b.status==='conflict'?android:samsung;
  const stale=b.status==='conflict'?second:first;
  assert.equal((await loser.transport.execute(stale)).status,'conflict','Persisted version conflict');
  const viewer=user('viewerUid');
  assert.equal((await viewer.transport.execute(command('viewer-e','viewerUid','android-view',1,{a:8,b:4}))).status,'forbidden','Server rules enforce role');
  const otherAndroidSameAccount=user('samsungUid');
  const same=await otherAndroidSameAccount.transport.execute(command('same-account','samsungUid','second-android',1,{a:5,b:6}));
  assert.equal(same.status,'applied',JSON.stringify(same));
  assert.equal((await assertSucceeds(android.db.ref('tournaments/clubA/matches/m1').once('value'))).val().version,2);
  console.log('OK V2 MAJ70 SDK+emulator: Samsung vs Android concurrent transaction, conflict, immutable receipt retry, viewer forbidden, same Google UID on second Android');
 }finally{await env.cleanup()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
