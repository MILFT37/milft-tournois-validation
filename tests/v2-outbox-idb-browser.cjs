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
   const claimed3=await db.claimNext(scope,{now:3500,leaseMs:1000});
   const reclaimed=await db.claimNext(scope,{now:4200,leaseMs:1000});
   const stale=await db.finish(scope,'evt2',oldToken,'applied',{now:4201});
   const ack=await db.finish(scope,'evt2',reclaimed.leaseToken,'applied',{now:4250});
   const repeat=await db.enqueue(scope,two,4300);
   const collision=await db.enqueue(scope,{...two,goals:{a:0,b:0}},4301);
   const remaining=await db.list(scope);
   const prod=localStorage.getItem('milft_prod_v11_20261117_tournois_v01');
   db.close();return {entries,independent,claimed3,reclaimed,stale,ack,repeat,collision,remaining,prod};
  },{scope,other,two,oldToken:before.sending.leaseToken});
  assert.equal(after.entries.length,3,'Durable IndexedDB survives browser restart');
  assert.deepEqual(after.entries.map(x=>x.state),['conflict','sending','pending']);
  assert.equal(after.independent.length,1);
  assert.equal(after.claimed3.command.id,'evt3','Unexpired sending lease is protected');
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
  console.log('OK V2 MAJ 69 '+engine.name+': persistent browser restart, two-tab leases, conflict retention, receipts, isolation, no network');
 }finally{
  if(context)await context.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(profile,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
