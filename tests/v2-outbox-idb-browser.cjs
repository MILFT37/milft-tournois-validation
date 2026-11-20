'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),os=require('node:os'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.MILFT_BROWSER==='webkit'?webkit:chromium,root=process.cwd();
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'milft-v2-'));
const scope={tournamentId:'tournoi69',actorId:'samsung',deviceId:'phone'};
const other={tournamentId:'autre69',actorId:'pc',deviceId:'desktop'};
const command=(s,id,score)=>({...s,id,matchId:'match1',type:'set.record',expectedVersion:0,setIndex:0,goals:score});
const one=command(scope,'evt1',{a:5,b:3}),two=command(scope,'evt2',{a:5,b:4}),three=command(scope,'evt3',{a:8,b:6});
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(!['/v2/outbox-test.html','/v2/outbox-idb.js'].includes(pathname)){res.writeHead(404).end();return;}
 fs.readFile(path.join(root,pathname),(err,data)=>{
  if(err){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'application/javascript':'text/html','Cache-Control':'no-store'}).end(data);
 });
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,url=origin+'/v2/outbox-test.html';
 let context=null;
 const launch=()=>engine.launchPersistentContext(profile,{headless:true,viewport:{width:390,height:844},serviceWorkers:'block'});
 const pageReady=async()=>{
  const p=await context.newPage();
  p.on('request',req=>assert(req.url().startsWith(origin+'/v2/'),'Network must stay on synthetic V2 page'));
  await p.goto(url,{waitUntil:'load'});assert.match(await p.locator('h1').innerText(),/TEST ISOLÉ V2/);return p;
 };
 try{
  context=await launch();
  const p=await pageReady();
  const initial=await p.evaluate(async({scope,other,one})=>{
   const db=await MILFTV2Outbox.open({indexedDB});
   const queued=await db.enqueue(scope,one,1000);
   const dup=await db.enqueue(scope,one,1001);
   const collision=await db.enqueue(scope,{...one,goals:{a:2,b:2}},1002);
   const otherStatus=await db.enqueue(other,{...one,...other},1003);
   let foreign=false;try{await db.enqueue(other,one,1004)}catch{foreign=true}
   const mine=await db.list(scope),theirs=await db.list(other);db.close();
   return {queued,dup,collision,otherStatus,foreign,mine,theirs};
  },{scope,other,one});
  assert.equal(initial.queued.status,'queued');
  assert.equal(initial.dup.status,'duplicate');
  assert.equal(initial.collision.status,'id-collision');
  assert.equal(initial.foreign,true);
  assert.equal(initial.mine.length,1);assert.equal(initial.theirs.length,1);
  const p2=await pageReady();
  const leases=await Promise.all([p,p2].map(page=>page.evaluate(async scope=>{
   const db=await MILFTV2Outbox.open({indexedDB}),job=await db.claimNext(scope,{now:2000,leaseMs:1000});db.close();return job;
  },scope)));
  assert.equal(leases.filter(Boolean).length,1,'Atomic claims across browser tabs');
  const lease=leases.find(Boolean);
  assert.equal(lease.command.id,'evt1');
  const statuses=await p.evaluate(async({scope,lease})=>{
   const db=await MILFTV2Outbox.open({indexedDB});
   const transient=await db.finish(scope,'evt1',lease.leaseToken,'temporary-error',{now:2050,reason:'offline'});
   const retry=await db.claimNext(scope,{now:2100,leaseMs:1000});
   const conflict=await db.finish(scope,'evt1',retry.leaseToken,'conflict',{now:2150,reason:'stale version'});
   const entries=await db.list(scope);db.close();return {transient,conflict,entries};
  },{scope,lease});
  assert.equal(statuses.transient.status,'pending');
  assert.equal(statuses.conflict.status,'conflict');
  assert.equal(statuses.entries[0].state,'conflict','Conflict preserved');
  const before=await p.evaluate(async({scope,two,three})=>{
   const db=await MILFTV2Outbox.open({indexedDB});
   await db.enqueue(scope,two,3000);
   const sending=await db.claimNext(scope,{now:3100,leaseMs:1000});
   await db.enqueue(scope,three,3200);
   localStorage.setItem('milft_prod_v11_20261117_tournois_v01','PROD-PRESERVE');
   const entries=await db.list(scope);db.close();return {sending,entries};
  },{scope,two,three});
  assert.deepEqual(before.entries.map(x=>x.state),['conflict','sending','pending']);
  await context.close();context=null;
  context=await launch();
  const reopened=await pageReady();
  const after=await reopened.evaluate(async({scope,other,two,oldToken})=>{
   const db=await MILFTV2Outbox.open({indexedDB});
   const entries=await db.list(scope),independent=await db.list(other);
   const held=await db.claimNext(scope,{now:3500,leaseMs:1000});
   const reclaimed=await db.claimNext(scope,{now:4200,leaseMs:1000});
   const stale=await db.finish(scope,'evt2',oldToken,'applied',{now:4201});
   const ack=await db.finish(scope,'evt2',reclaimed.leaseToken,'applied',{now:4250});
   const claimed3=await db.claimNext(scope,{now:4251,leaseMs:1000});
   const repeat=await db.enqueue(scope,two,4300);
   const collision=await db.enqueue(scope,{...two,goals:{a:0,b:0}},4301);
   const remaining=await db.list(scope);
   const prod=localStorage.getItem('milft_prod_v11_20261117_tournois_v01');
   db.close();return {entries,independent,held,claimed3,reclaimed,stale,ack,repeat,collision,remaining,prod};
  },{scope,other,two,oldToken:before.sending.leaseToken});
  assert.equal(after.entries.length,3,'Durable IndexedDB survives browser restart');
  assert.deepEqual(after.entries.map(x=>x.state),['conflict','sending','pending']);
  assert.equal(after.independent.length,1);
  assert.equal(after.held,null,'A later pending command cannot bypass an unexpired earlier lease');
  assert.equal(after.claimed3.command.id,'evt3','Next command becomes claimable after earlier one is acknowledged');
  assert.equal(after.reclaimed.command.id,'evt2','Expired sending lease can be reclaimed');
  assert.notEqual(after.reclaimed.leaseToken,before.sending.leaseToken);
  assert.equal(after.stale.status,'stale-lease','Stale ack must never delete');
  assert.equal(after.ack.status,'confirmed');
  assert.equal(after.repeat.status,'already-confirmed','Receipt survives deletion');
  assert.equal(after.collision.status,'id-collision','Never reuse confirmed IDs with changed payload');
  assert.equal(after.remaining.length,2);
  assert.equal(after.remaining.find(x=>x.command.id==='evt1').state,'conflict');
  assert.equal(after.remaining.find(x=>x.command.id==='evt3').state,'sending');
  assert.equal(after.prod,'PROD-PRESERVE','Never touch V1 storage keys');
  const blocked=await reopened.evaluate(async other=>{
   const db=await MILFTV2Outbox.open({indexedDB});
   const job=await db.claimNext(other,{now:9000,leaseMs:1000});
   let unknownRejected=false;try{await db.finish(other,job.command.id,job.leaseToken,'unverified',{now:9001})}catch{unknownRejected=true}
   const forbidden=await db.finish(other,job.command.id,job.leaseToken,'forbidden',{now:9002,reason:'401'});
   const state=await db.list(other);db.close();return {unknownRejected,forbidden,state};
  },other);
  assert(blocked.unknownRejected);
  assert.equal(blocked.forbidden.status,'blocked');
  assert.equal(blocked.state[0].state,'blocked');
  // MAJ81 : des IDs inversés alphabétiquement ne changent jamais
  // l'ordre chronologique et un bail actif bloque la saisie suivante.
  const ordering=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial81',actorId:'owner81',deviceId:'phone81'};
    const mk=(id,version,goals)=>({...s,id,matchId:'demo',type:'set.record',expectedVersion:version,setIndex:0,goals});
    await db.enqueue(s,mk('evtZfirst',0,{a:1,b:0}),10000);
    await db.enqueue(s,mk('evtAsecond',1,{a:2,b:0}),10001);
    const first=await db.claimNext(s,{now:10100,leaseMs:1000});
    const blocked=await db.claimNext(s,{now:10200,leaseMs:1000});
    const stolen=await db.claimNext(s,{now:11101,leaseMs:1000});
    const stale=await db.finish(s,first.command.id,first.leaseToken,'applied',{now:11102});
    const done=await db.finish(s,stolen.command.id,stolen.leaseToken,'applied',{now:11103});
    const second=await db.claimNext(s,{now:11104,leaseMs:1000});
    const final=await db.finish(s,second.command.id,second.leaseToken,'applied',{now:11105});
    const empty=await db.list(s);
    db.close();
    return {first:first?.command.id,blocked,stolen:stolen?.command.id,
      stale:stale.status,done:done.status,second:second?.command.id,
      final:final.status,remaining:empty.length};
  });
  assert.equal(ordering.first,'evtZfirst','FIFO must follow creation timestamps, not event IDs');
  assert.equal(ordering.blocked,null,'Second entry must wait while first lease is active');
  assert.equal(ordering.stolen,'evtZfirst','Expired head is reclaimed first');
  assert.equal(ordering.stale,'stale-lease','Late acknowledgement from an expired lease cannot delete');
  assert.equal(ordering.done,'confirmed');
  assert.equal(ordering.second,'evtAsecond','Only then can the second event be claimed');
  assert.equal(ordering.final,'confirmed');
  assert.equal(ordering.remaining,0);
  // MAJ82 : les scores successifs saisis hors ligne sur le même match
  // reçoivent des versions distinctes et restent liés jusqu'à confirmation.
  const chained=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial82success',actorId:'samsung82',deviceId:'phone82'};
    const make=(id,goals)=>({...s,id,matchId:'demo',type:'set.record',expectedVersion:0,setIndex:0,goals});
    const first=make('evtZ82first',{a:2,b:1}),second=make('evtA82second',{a:4,b:2});
    const one=await db.enqueue(s,first,20000,{chainLocalScore:true});
    const two=await db.enqueue(s,second,20001,{chainLocalScore:true});
    const replay=await db.enqueue(s,second,20002,{chainLocalScore:true});
    const queued=await db.list(s);
    const claim1=await db.claimNext(s,{now:20100,leaseMs:1000});
    const leased=await db.claimNext(s,{now:20101,leaseMs:1000});
    const ack1=await db.finish(s,claim1.command.id,claim1.leaseToken,'applied',{now:20102});
    const claim2=await db.claimNext(s,{now:20103,leaseMs:1000});
    const ack2=await db.finish(s,claim2.command.id,claim2.leaseToken,'applied',{now:20104});
    const confirmedReplay=await db.enqueue(s,second,20105,{chainLocalScore:true});
    const remaining=await db.list(s);db.close();
    return {one,two,replay,queued:queued.map(x=>({id:x.command.id,v:x.command.expectedVersion,dependsOn:x.dependsOn})),
      first:claim1?.command.id,leased,ack1:ack1.status,second:claim2?.command.id,
      secondVersion:claim2?.command.expectedVersion,ack2:ack2.status,
      confirmedReplay,remaining:remaining.length};
  });
  assert.deepEqual([chained.one.status,chained.two.status,chained.replay.status],
    ['queued','queued','duplicate'],'A repeated offline command must stay idempotent');
  assert.deepEqual(chained.queued,[
    {id:'evtZ82first',v:0,dependsOn:null},
    {id:'evtA82second',v:1,dependsOn:'evtZ82first'}
  ],'Second offline score must depend on first and use the next version');
  assert.equal(chained.first,'evtZ82first');
  assert.equal(chained.leased,null,'Unexpired predecessor blocks later local score');
  assert.equal(chained.ack1,'confirmed');
  assert.equal(chained.second,'evtA82second');
  assert.equal(chained.secondVersion,1);
  assert.equal(chained.ack2,'confirmed');
  assert.equal(chained.confirmedReplay.status,'already-confirmed');
  assert.equal(chained.remaining,0);
  const rejectedChain=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial82conflict',actorId:'samsung82',deviceId:'phone82'};
    const make=(id,goals)=>({...s,id,matchId:'demo',type:'set.record',expectedVersion:0,setIndex:0,goals});
    await db.enqueue(s,make('evt82conflicting',{a:2,b:1}),22000,{chainLocalScore:true});
    await db.enqueue(s,make('evt82dependent',{a:4,b:2}),22001,{chainLocalScore:true});
    const first=await db.claimNext(s,{now:22100,leaseMs:1000});
    await db.finish(s,first.command.id,first.leaseToken,'conflict',{now:22101,reason:'remote changed'});
    const second=await db.claimNext(s,{now:22102,leaseMs:1000});
    const items=(await db.list(s)).map(x=>({id:x.command.id,state:x.state,dependsOn:x.dependsOn}));
    db.close();return {second,items};
  });
  assert.equal(rejectedChain.second,null,'Never overwrite remote edits through a dependent score after conflict');
  assert.deepEqual(rejectedChain.items,[
    {id:'evt82conflicting',state:'conflict',dependsOn:null},
    {id:'evt82dependent',state:'conflict',dependsOn:'evt82conflicting'}
  ],'Both conflicting and dependent scores must be preserved');
  await reopened.reload();
  const afterRestart=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial82conflict',actorId:'samsung82',deviceId:'phone82'};
    const claim=await db.claimNext(s,{now:30000,leaseMs:1000});
    const entries=await db.list(s);db.close();return {claim,entries:entries.length};
  });
  assert.equal(afterRestart.claim,null,'Dependent operation remains protected after browser reload');
  assert.equal(afterRestart.entries,2,'No offline score lost on reload');
  // MAJ83 : un conflit sur la tête ne doit ni supprimer les descendants
  // ni empêcher une nouvelle saisie indépendante, fondée sur Firebase.
  const stranded=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial83recovery',actorId:'samsung83',deviceId:'phone83'};
    const mk=(id,version,a)=>({...s,id,matchId:'demo',type:'set.record',expectedVersion:version,setIndex:0,goals:{a,b:0}});
    const mode={chainLocalScore:true};
    await db.enqueue(s,mk('evtZ83first',0,1),40000,mode);
    await db.enqueue(s,mk('evtA83second',0,2),40001,mode);
    await db.enqueue(s,mk('evtB83third',0,3),40002,mode);
    const initial=(await db.list(s)).map(x=>({id:x.command.id,version:x.command.expectedVersion,parent:x.dependsOn}));
    const head=await db.claimNext(s,{now:40100,leaseMs:1000});
    const failed=await db.finish(s,head.command.id,head.leaseToken,'conflict',{now:40101,reason:'other-device'});
    const fresh=await db.enqueue(s,mk('evtC83fresh',1,4),40102,mode);
    const claimed=await db.claimNext(s,{now:40103,leaseMs:1000});
    const beforeFinish=(await db.list(s)).map(x=>({id:x.command.id,state:x.state,parent:x.dependsOn,reason:x.reason}));
    const final=await db.finish(s,claimed.command.id,claimed.leaseToken,'applied',{now:40104});
    const remaining=await db.list(s);
    db.close();
    return {initial,first:head.command.id,failed:failed.status,fresh:fresh.status,
      claimed:claimed?.command.id,claimedVersion:claimed?.command.expectedVersion,
      beforeFinish,final:final.status,remaining:remaining.map(x=>({id:x.command.id,state:x.state}))};
  });
  assert.deepEqual(stranded.initial.map(x=>x.version),[0,1,2],
    'Offline dependent commands must have increasing versions');
  assert.deepEqual(stranded.initial.map(x=>x.parent),[null,'evtZ83first','evtA83second']);
  assert.equal(stranded.failed,'conflict');
  assert.equal(stranded.fresh,'queued');
  assert.equal(stranded.claimed,'evtC83fresh','Fresh independent score must not be starved');
  assert.equal(stranded.claimedVersion,1,'Fresh score must use current remote version');
  assert.deepEqual(stranded.beforeFinish.map(x=>x.state),['conflict','conflict','conflict','sending']);
  assert.deepEqual(stranded.beforeFinish.slice(1,3).map(x=>x.reason.includes('non confirmé')),[true,true],
    'Dependent scores preserved as explicit conflicts');
  assert.equal(stranded.beforeFinish[3].parent,null,'Fresh score cannot inherit a rejected chain');
  assert.equal(stranded.final,'confirmed');
  assert.deepEqual(stranded.remaining.map(x=>x.state),['conflict','conflict','conflict']);
  await reopened.reload();
  const restoredChain=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial83recovery',actorId:'samsung83',deviceId:'phone83'};
    const entries=await db.list(s);
    const pending=await db.claimNext(s,{now:50000,leaseMs:1000});
    db.close();return {entries:entries.map(x=>x.state),pending};
  });
  assert.deepEqual(restoredChain.entries,['conflict','conflict','conflict'],
    'Rejected scores remain stored across reload');
  assert.equal(restoredChain.pending,null,'No blocked descendant sent after a reload');
  // MAJ84 : une panne temporaire laisse le même ID en attente,
  // bloque la file pendant la temporisation et résiste au redémarrage.
  const temporary=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial84retry',actorId:'samsung84',deviceId:'phone84'};
    const mk=(id,version)=>({...s,id,matchId:'demo',type:'set.record',
      expectedVersion:version,setIndex:0,goals:{a:5,b:3}});
    await db.enqueue(s,mk('evtZ84retry',0),60000,{chainLocalScore:true});
    await db.enqueue(s,mk('evtA84following',1),60001,{chainLocalScore:true});
    const first=await db.claimNext(s,{now:60100,leaseMs:1000});
    const failure=await db.finish(s,first.command.id,first.leaseToken,'temporary-error',
      {now:60101,retryAfterMs:2000,reason:'temporary-network'});
    const held=await db.claimNext(s,{now:60200,leaseMs:1000});
    const entries=await db.list(s);
    db.close();return {first:first.command.id,failure,held,entries:entries.map(x=>({state:x.state,retryAt:x.retryAt,attempts:x.attempts}))};
  });
  assert.equal(temporary.first,'evtZ84retry');
  assert.equal(temporary.failure.status,'pending');
  assert.equal(temporary.failure.retryAt,62101);
  assert.equal(temporary.held,null,'Temporary error must prevent hot looping and FIFO bypass');
  assert.deepEqual(temporary.entries.map(x=>x.state),['pending','pending']);
  assert.equal(temporary.entries[0].attempts,1);
  await reopened.reload();
  const retryAfterReload=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial84retry',actorId:'samsung84',deviceId:'phone84'};
    const held=await db.claimNext(s,{now:62099,leaseMs:1000});
    const resumed=await db.claimNext(s,{now:62102,leaseMs:1000});
    const ack=await db.finish(s,resumed.command.id,resumed.leaseToken,'applied',{now:62103});
    const next=await db.claimNext(s,{now:62104,leaseMs:1000});
    const ackNext=await db.finish(s,next.command.id,next.leaseToken,'applied',{now:62105});
    const empty=await db.list(s);db.close();
    return {held,resumedId:resumed.command.id,resumedAttempts:resumed.attempts,
      ack:ack.status,nextId:next.command.id,ackNext:ackNext.status,empty:empty.length};
  });
  assert.equal(retryAfterReload.held,null,'Retry delay must survive browser restart');
  assert.equal(retryAfterReload.resumedId,'evtZ84retry','Retry must reuse original ID');
  assert.equal(retryAfterReload.resumedAttempts,2);
  assert.equal(retryAfterReload.ack,'confirmed');
  assert.equal(retryAfterReload.nextId,'evtA84following');
  assert.equal(retryAfterReload.ackNext,'confirmed');
  assert.equal(retryAfterReload.empty,0);
  const manual=await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB});
    const s={tournamentId:'trial84manual',actorId:'samsung84',deviceId:'phone84'};
    const cmd={...s,id:'evt84manual',matchId:'demo',type:'set.record',
      expectedVersion:0,setIndex:0,goals:{a:1,b:0}};
    await db.enqueue(s,cmd,70000);
    const first=await db.claimNext(s,{now:70100,leaseMs:1000});
    await db.finish(s,first.command.id,first.leaseToken,'temporary-error',
      {now:70101,retryAfterMs:60000});
    const automatic=await db.claimNext(s,{now:70102,leaseMs:1000});
    const forced=await db.claimNext(s,{now:70103,leaseMs:1000,ignoreRetryAt:true});
    const confirmed=await db.finish(s,forced.command.id,forced.leaseToken,'applied',{now:70104});
    const replay=await db.enqueue(s,cmd,70105);
    db.close();return {automatic,forcedId:forced.command.id,confirmed:confirmed.status,replay:replay.status};
  });
  assert.equal(manual.automatic,null);
  assert.equal(manual.forcedId,'evt84manual','Explicit retry can bypass only retry timeout');
  assert.equal(manual.confirmed,'confirmed');
  assert.equal(manual.replay,'already-confirmed','Manual retry preserves idempotency');
  console.log('OK V2 MAJ84 '+engine.name+': durable retry deadline, FIFO, manual override and receipts');
 }finally{
  if(context)await context.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(profile,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
