'use strict';
const assert=require('node:assert/strict');
const {createTransport}=require('../v2/firebase-match-transport.cjs');
const data={tournaments:{clubA:{members:{samsungUid:'admin',android2Uid:'editor',guestUid:'viewer'},matches:{m1:{version:0,status:'playing',sets:{},updatedBy:'seed',lastEventId:'seed',lastEventFingerprint:'seed'},m2:{version:0,status:'playing',sets:{},updatedBy:'seed',lastEventId:'seed',lastEventFingerprint:'seed'}}},clubB:{members:{android2Uid:'viewer'},matches:{m1:{version:0,status:'playing',sets:{},updatedBy:'seed',lastEventId:'seed',lastEventFingerprint:'seed'}}}}};
const copied=x=>JSON.parse(JSON.stringify(x));
const watches=new Map(),callLog=[];
function sdkFor(auth){
  return {
    ref(_db,p){return p},
    async runTransaction(p,fn){
      const [a,tid,b,mid]=p.split('/');
      assert.equal(a,'tournaments');assert.equal(b,'matches');
      const tournament=data.tournaments[tid],role=tournament?.members[auth.currentUser.uid];
      if(!['admin','editor'].includes(role))throw Object.assign(Error('Permission denied'),{code:'database/permission-denied'});
      const current=tournament.matches[mid],proposed=fn(copied(current));
      if(proposed===undefined)return {committed:false,snapshot:{val:()=>copied(current)}};
      assert.equal(proposed.updatedBy,auth.currentUser.uid);
      assert.equal(proposed.version,current.version+1);
      tournament.matches[mid]=copied(proposed);
      callLog.push({uid:auth.currentUser.uid,p});
      for(const fnc of watches.get(p)||[])fnc({val:()=>copied(proposed)});
      return {committed:true,snapshot:{val:()=>copied(proposed)}};
    },
    onValue(p,listener){
      const set=watches.get(p)||new Set();set.add(listener);watches.set(p,set);
      const [_,tid,__,mid]=p.split('/');
      const current=data.tournaments[tid]?.matches[mid];
      listener({val:()=>copied(current)});
      return ()=>{set.delete(listener)};
    }
  };
}
const transport=uid=>{const auth={currentUser:{uid}};return createTransport({database:{},auth,sdk:sdkFor(auth)})};
const cmd=(tid,match,id,uid,deviceId,expectedVersion,goals)=>({id,tournamentId:tid,matchId:match,actorId:uid,deviceId,type:'set.record',expectedVersion,setIndex:0,goals});
(async()=>{
 const samsung=transport('samsungUid'),android=transport('android2Uid'),guest=transport('guestUid');
 const scores=[];
 const unwatch=android.watch('clubA','m1',snapshot=>scores.push(snapshot?.version));
 const a=cmd('clubA','m1','e-a','samsungUid','galaxy-s25',0,{a:5,b:3});
 const b=cmd('clubA','m1','e-b','android2Uid','android-other',0,{a:5,b:4});
 const results=await Promise.all([samsung.execute(a),android.execute(b)]);
 assert.deepEqual(results.map(x=>x.status).sort(),['applied','conflict'],'Two Androids updating same version: only one success');
 assert.equal(data.tournaments.clubA.matches.m1.version,1);
 assert.equal(scores.at(-1),1,'Second Android receives new version via live listener');
 const winner=results[0].status==='applied'?a:b,loser=results[0].status==='applied'?b:a;
 assert.equal((await (winner===a?samsung:android).execute(winner)).status,'duplicate','Idempotent retry');
 assert.equal((await (winner===a?samsung:android).execute({...winner,goals:{a:1,b:1}})).status,'id-collision','Collision ID');
 assert.equal((await (loser===b?android:samsung).execute(loser)).status,'conflict');
 assert.deepEqual(data.tournaments.clubA.matches.m1.sets['0'],winner.goals,'No silent overwrite');
 assert.equal((await guest.execute(cmd('clubA','m1','e-guest','guestUid','android-view',1,{a:9,b:0}))).status,'forbidden');
 assert.equal((await samsung.execute({...a,id:'forge',actorId:'android2Uid',expectedVersion:1})).status,'forbidden','Client rejects forged actor');
 assert.equal((await android.execute(cmd('clubB','m1','e-other','android2Uid','android-other',0,{a:9,b:3}))).status,'forbidden','Tournament scope enforced');
 const independent=await android.execute(cmd('clubA','m2','e-m2','android2Uid','android-other',0,{a:8,b:6}));
 assert.equal(independent.status,'applied');assert.equal(data.tournaments.clubA.matches.m1.version,1);
 const sameUidSecondPhone=transport('samsungUid');
 const secondPhone=await sameUidSecondPhone.execute(cmd('clubA','m1','e-same','samsungUid','android-spare',1,{a:5,b:4}));
 assert.equal(secondPhone.status,'applied','Same account on two Android devices works');
 assert.equal(data.tournaments.clubA.matches.m1.version,2);
 const blocked=await android.execute({...b,id:'not-allowed',type:'match.forfeit',expectedVersion:2,winner:'a'});
 assert.equal(blocked.status,'unsupported','No unsafely deployed table / forfeit transport');
 // Test outbox bridge: refuse ack until server confirms.
 const mockOutbox={
   jobs:[cmd('clubA','m1','e-queue','android2Uid','android-other',2,{a:7,b:5})],
   results:[],
   async claimNext(){const command=this.jobs.shift();return command?{command,leaseToken:'lease-12345'}:null},
   async finish(_scope,id,token,outcome){this.results.push({id,token,outcome});return {status:outcome==='applied'?'confirmed':outcome}}
 };
 const drain=await android.transmitOne(mockOutbox,{tournamentId:'clubA',actorId:'android2Uid',deviceId:'android-other'});
 assert.equal(drain.status,'applied');assert.deepEqual(mockOutbox.results.map(x=>x.outcome),['applied']);
 // Genuine network failure: never ack.
 const broken=createTransport({database:{},auth:{currentUser:{uid:'android2Uid'}},sdk:{
   ref(){return 'fake'},async runTransaction(){throw Error('network offline')},onValue(){return ()=>{}}
 }});
 const missing=await broken.execute(cmd('clubA','m1','e-lost','android2Uid','android-other',3,{a:8,b:8}));
 assert.equal(missing.status,'unavailable');
 unwatch();
 assert(callLog.every(x=>['samsungUid','android2Uid'].includes(x.uid)));
 console.log('OK V2 MAJ70: Samsung<->Android, distinct accounts, shared account, live listener, optimistic transactions, roles, conflicts and outbox confirmations');
})().catch(e=>{console.error(e);process.exitCode=1;});
