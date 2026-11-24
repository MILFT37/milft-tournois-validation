'use strict';
// MAJ112 — test du VRAI module de brouillons V2 sur HTTPS loopback.
// Deux onglets, disparition pendant attente de verrou, reprise sans écrasement.
// Aucun accès au LAN, Firebase réel, Drive, Google ou dépôt publié.
const assert=require('node:assert/strict');
const https=require('node:https');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const engine=process.env.MILFT_BROWSER==='webkit'?webkit:chromium;
const flavor=process.env.MILFT_BROWSER||'chromium';
const moduleSource=fs.readFileSync(path.join(root,'v2/draft-multimatch-emulator.mjs'),'utf8');
const fixture='<!doctype html><html lang="fr"><meta charset="utf-8"><title>MILFT MAJ112 - prototype isolé</title><body>Fixture uniquement</body></html>';
const scope={tournamentId:'trial112',actorId:'actor112',deviceId:'device112'};
const draft=(token,a,b)=>({a,b,baseVersion:0,format:'belle5',token});
async function evalDraft(page,operation,...args){
 return page.evaluate(async({operation,args,scope})=>{
  const m=await import('/draft-module.mjs'),id='matchA';
  if(operation==='save')return m.saveDraftIfCurrent(localStorage,navigator.locks,scope,id,args[0],args[1]);
  if(operation==='read')return m.readDraft(localStorage,scope,id,'belle5');
  if(operation==='discard')return m.discardDraftIfSame(localStorage,scope,id,args[0]);
  if(operation==='wrongActor')return m.readDraft(localStorage,{...scope,actorId:'other112'},id,'belle5');
  if(operation==='otherMatch')return m.saveDraftIfCurrent(localStorage,navigator.locks,scope,'matchB',null,args[0]);
  if(operation==='noLock') {
   try{await m.saveDraftIfCurrent(localStorage,null,scope,id,args[0],args[1]);return 'unexpected-success';}
   catch(e){return e.message;}
  }
  throw Error('Unsupported test operation');
 },{scope,operation,args});
}
async function main(){
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'firebase.v2.multimatch.emulator.json'),'utf8'));
 for(const service of ['auth','database'])assert.equal(cfg.emulators[service].host,'127.0.0.1');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'milft-112-'));
 let server,browser;
 try{
  const key=path.join(tmp,'temporary.key'),crt=path.join(tmp,'temporary.crt');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
   '-keyout',key,'-out',crt,'-days','1','-subj','/CN=localhost',
   '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
   const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'none'; base-uri 'none'"};
   if(req.url==='/fixture'){
    res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'}).end(fixture);return;
   }
   if(req.url==='/draft-module.mjs'){
    res.writeHead(200,{...headers,'Content-Type':'text/javascript; charset=utf-8'}).end(moduleSource);return;
   }
   res.writeHead(404,headers).end('Not found');
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  assert.equal(server.address().address,'127.0.0.1');
  const origin='https://127.0.0.1:'+server.address().port;
  browser=await engine.launch({headless:true});
  // Le certificat autosigné n'est toléré QUE pour cette CI temporaire.
  const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  const other=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  let blocked=0;
  for(const ctx of [context,other]){
   await ctx.route('**/*',route=>{
    if([origin+'/fixture',origin+'/draft-module.mjs'].includes(route.request().url()))return route.continue();
    blocked++;return route.abort();
   });
  }
  try{
   const holder=await context.newPage(),worker=await context.newPage(),isolated=await other.newPage();
   await Promise.all([holder.goto(origin+'/fixture'),worker.goto(origin+'/fixture'),isolated.goto(origin+'/fixture')]);
   const d0=draft('draftFirst','5','1'),d1=draft('draftPending','5','2'),d2=draft('draftRecovered','5','3');
   assert.equal((await evalDraft(holder,'save',null,d0)).status,'saved');
   assert.deepEqual(await evalDraft(worker,'read'),d0,'Second tab sees last durable draft');
   assert.equal(await evalDraft(isolated,'read'),null,'Other browser context is independent');
   assert.equal(await evalDraft(holder,'wrongActor'),null,'Different UID cannot see draft');
   assert.match(await evalDraft(worker,'noLock','draftFirst',d1),/Verrou inter-onglets indisponible/);
   assert.deepEqual(await evalDraft(holder,'read'),d0,'No-lock failure must not overwrite data');

   // Holder holds the actual per-match key of the real V2 module.
   await holder.evaluate(scope=>{
    window.holding=false;
    window.holdResult=import('/draft-module.mjs').then(m=>
     m.withDraftLock(navigator.locks,scope,'matchA',()=>new Promise(resolve=>{
      window.holding=true;window.releaseDraftLock=resolve;
     })));
   },scope);
   await holder.waitForFunction(()=>window.holding===true);

   // Worker attempts a save but disappears while queued; never committed.
   await worker.evaluate(({scope,d1})=>{
    window.pendingOutcome='pending';
    window.pending=import('/draft-module.mjs').then(m=>
     m.saveDraftIfCurrent(localStorage,navigator.locks,scope,'matchA','draftFirst',d1))
      .then(()=>window.pendingOutcome='saved',()=>window.pendingOutcome='rejected');
   },{scope,d1});
   await holder.waitForFunction(async()=>{
    const q=await navigator.locks.query();
    return q.pending.some(x=>x.name.includes('MILFT_V2_DRAFT100_')&&x.name.includes('matchA'));
   });

   // Another MATCH must be able to save even while A remains locked.
   assert.equal((await evalDraft(worker,'otherMatch',draft('draftB','6','4'))).status,'saved');
   assert.deepEqual(await evalDraft(holder,'read'),d0,'A is not changed while blocked');
   await worker.close(); // crash/abrupt close, not a graceful save acknowledgement.
   await holder.evaluate(()=>window.releaseDraftLock());
   await holder.evaluate(()=>window.holdResult);
   assert.deepEqual(await evalDraft(holder,'read'),d0,'Closing pending writer never overwrites saved draft');

   // A fresh tab must read the durable last version and continue from it.
   const reopened=await context.newPage();
   await reopened.goto(origin+'/fixture');
   assert.deepEqual(await evalDraft(reopened,'read'),d0);
   assert.equal((await evalDraft(reopened,'save','draftFirst',d2)).status,'saved');
   assert.deepEqual(await evalDraft(holder,'read'),d2);
   assert.equal((await evalDraft(holder,'save','draftFirst',d1)).status,'stale',
    'Late writer from previous generation must not overwrite newer draft');
   assert.equal(await evalDraft(holder,'discard','draftFirst'),false,
    'Late receipt must not clear newer durable draft');
   assert.deepEqual(await evalDraft(holder,'read'),d2);

   // Crash after durable write but before receiving its acknowledgment:
   // on reopening, retrying with old token must be idempotently rejected.
   await reopened.close();
   const retry=await context.newPage();
   await retry.goto(origin+'/fixture');
   assert.deepEqual(await evalDraft(retry,'read'),d2);
   assert.equal((await evalDraft(retry,'save','draftFirst',d1)).status,'stale');
   assert.deepEqual(await evalDraft(retry,'read'),d2);
   assert.equal(blocked,0,'Every request stays on the HTTPS loopback fixture');
   console.log('OK MAJ112 '+flavor+
    ': vrai module brouillons, écriture bloquée puis onglet fermé, autre match indépendant, récupération durable et jetons périmés refusés');
  }finally{await Promise.allSettled([context.close(),other.close()]);}
 }finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
