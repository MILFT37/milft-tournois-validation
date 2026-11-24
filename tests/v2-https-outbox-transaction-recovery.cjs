'use strict';
// MAJ113 — VRAIE file multi-match IndexedDB, uniquement HTTPS loopback en CI.
// Une transaction explicitement annulée ne doit jamais devenir un score confirmé.
const assert=require('node:assert/strict');
const https=require('node:https');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const flavor=process.env.MILFT_BROWSER==='webkit'?'webkit':'chromium';
const engine=flavor==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'v2/outbox-multimatch-emulator.js'),'utf8');
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><title>MILFT 113 isolated</title><body>Test local</body>';
const dbName='MILFT_V2_MAJ113_OUTBOX_TEST';
const scope={tournamentId:'trial113',actorId:'actor113',deviceId:'device113'};
const command=(id,matchId,a,b)=>({...scope,id,matchId,type:'set.record',expectedVersion:0,
 format:'belle5',setIndex:0,goals:{a,b}});
async function op(page,action,args={}){
 return page.evaluate(async({dbName,scope,action,args})=>{
  const db=await MILFTV2Outbox.open({indexedDB,dbName});
  try{
   if(action==='enqueue')return db.enqueue(scope,args.command,args.now,{chainLocalScore:true});
   if(action==='list')return (await db.list(scope)).map(x=>({id:x.command.id,state:x.state,matchId:x.command.matchId,leaseToken:x.leaseToken,leaseUntil:x.leaseUntil}));
   if(action==='claim'){const x=await db.claimNext(scope,{now:args.now,leaseMs:1000});return x?{id:x.command.id,leaseToken:x.leaseToken}:null;}
   if(action==='finish')return db.finish(scope,args.id,args.token,args.outcome,{now:args.now});
   throw Error('action invalide');
  }finally{db.close();}
 },{dbName,scope,action,args});
}
async function main(){
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'firebase.v2.multimatch.emulator.json'),'utf8'));
 for(const service of ['auth','database'])assert.equal(cfg.emulators[service].host,'127.0.0.1');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'milft-113-'));
 let server,browser;
 try{
  const key=path.join(tmp,'key.pem'),cert=path.join(tmp,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
   '-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost',
   '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
   const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'none'; base-uri 'none'"};
   if(req.url==='/fixture'){res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
   if(req.url==='/outbox.js'){res.writeHead(200,{...headers,'Content-Type':'text/javascript; charset=utf-8'}).end(moduleSource);return;}
   res.writeHead(404,headers).end('Not found');
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  assert.equal(server.address().address,'127.0.0.1');
  const origin='https://127.0.0.1:'+server.address().port;
  browser=await engine.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  const other=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  let blocked=0;
  for(const ctx of [context,other]){
   await ctx.route('**/*',route=>{
    if([origin+'/fixture',origin+'/outbox.js'].includes(route.request().url()))return route.continue();
    blocked++;return route.abort();
   });
  }
  async function open(ctx){
   const p=await ctx.newPage();
   await p.goto(origin+'/fixture');await p.addScriptTag({url:origin+'/outbox.js'});
   return p;
  }
  try{
   const a=await open(context),b=await open(context),isolated=await open(other);
   const first=command('evt113A','matchA',5,3),second=command('evt113B','matchB',6,4);
   assert.equal((await op(a,'enqueue',{command:first,now:1000})).status,'queued');
   assert.deepEqual((await op(a,'list')).map(x=>x.id),['evt113A']);
   assert.deepEqual(await op(isolated,'list'),[],'Separate context must never see other IndexedDB');

   // Transaction explicitly aborted BEFORE commit, emulating interruption
   // during an IndexedDB write. This is deterministic; browser termination
   // during a live transaction would not have a portable timing guarantee.
   const aborted=await b.evaluate(async({dbName,scope})=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName});db.close();
    return new Promise((resolve,reject)=>{
     const request=indexedDB.open(dbName,1);
     request.onerror=()=>reject(request.error);
     request.onsuccess=()=>{
      const raw=request.result;
      const tx=raw.transaction(['commands'],'readwrite');
      const sk=JSON.stringify([scope.tournamentId,scope.actorId,scope.deviceId]);
      const key=JSON.stringify([sk,'evt113Aborted']);
      tx.objectStore('commands').put({
       key,scope:sk,command:{...scope,id:'evt113Aborted',matchId:'matchA',
        type:'set.record',expectedVersion:0,format:'belle5',setIndex:0,goals:{a:5,b:1}},
       state:'pending',createdAt:1002,updatedAt:1002,attempts:0
      });
      tx.oncomplete=()=>{raw.close();reject(Error('Cancelled transaction committed unexpectedly'));};
      tx.onabort=()=>{raw.close();resolve('aborted');};
      tx.onerror=()=>{};
      tx.abort();
     };
    });
   },{dbName,scope});
   assert.equal(aborted,'aborted');
   await b.close();
   assert.deepEqual((await op(a,'list')).map(x=>x.id),['evt113A'],
    'Aborted write must not create a phantom command');

   // Durable write survives tab close; A gets a lease. While it is held,
   // independent B must still progress. Closing A before confirmation
   // leaves it recoverable only after lease expiry, never overwritten.
   const leaseA=await op(a,'claim',{now:1100});assert.equal(leaseA.id,'evt113A');
   const reopened=await open(context);
   assert.equal((await op(reopened,'enqueue',{command:second,now:1200})).status,'queued');
   const leaseB=await op(reopened,'claim',{now:1300});
   assert.equal(leaseB.id,'evt113B','Another match must progress while A has active lease');
   assert.equal((await op(reopened,'finish',{id:leaseB.id,token:leaseB.leaseToken,outcome:'applied',now:1301})).status,'confirmed');
   await a.close();
   const held=await op(reopened,'claim',{now:1500});
   assert.equal(held,null,'A may not be claimed before lease expiry');
   const next=await op(reopened,'claim',{now:2101});
   assert.equal(next.id,'evt113A','Durable command recovers after tab close and expired lease');
   assert.notEqual(leaseA.leaseToken,next.leaseToken);
   assert.equal((await op(reopened,'finish',{id:leaseA.id,token:leaseA.leaseToken,outcome:'applied',now:2102})).status,'stale-lease');
   assert.equal((await op(reopened,'finish',{id:next.id,token:next.leaseToken,outcome:'applied',now:2103})).status,'confirmed');
   assert.deepEqual(await op(reopened,'list'),[]);
   assert.equal((await op(reopened,'enqueue',{command:first,now:2200})).status,'already-confirmed');
   assert.equal((await op(reopened,'enqueue',{command:second,now:2201})).status,'already-confirmed');
   await reopened.reload();await reopened.addScriptTag({url:origin+'/outbox.js'});
   assert.deepEqual(await op(reopened,'list'),[],'Receipts remain valid after reload');
   assert.equal((await op(reopened,'enqueue',{command:first,now:2300})).status,'already-confirmed');
   assert.equal(blocked,0,'No request beyond the HTTPS loopback fixtures');
   console.log('OK MAJ113 '+flavor+
    ': vrai module IndexedDB, transaction annulée, écriture durable, reprise après onglet fermé, bail ancien rejeté, autre match indépendant');
  }finally{await Promise.allSettled([context.close(),other.close()]);}
 }finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
