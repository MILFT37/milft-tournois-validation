'use strict';
// MAJ110: HTTPS réel UNIQUEMENT en loopback CI, aucun accès Firebase ni LAN.
const assert=require('node:assert/strict');
const https=require('node:https');
const os=require('node:os');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const flavor=process.env.MILFT_BROWSER==='webkit'?'webkit':'chromium';
const browserType=flavor==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..');
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><title>MILFT HTTPS isolated</title>Test HTTPS MAJ110';
function guard(){
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'firebase.v2.multimatch.emulator.json'),'utf8'));
 for(const n of ['auth','database'])assert.equal(cfg.emulators[n].host,'127.0.0.1');
 const deploy=fs.readFileSync(path.join(root,'.github/workflows/milft-pages-deploy.yml'),'utf8');
 for(const name of ['mobile-multimatch-emulator.html','outbox-multimatch-emulator.js','draft-multimatch-emulator.mjs'])
  assert(!deploy.includes(name),'Pages must not publish '+name);
}
async function put(page){
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('MILFT_MAJ110_INDEX',1);
  r.onerror=()=>reject(r.error);
  r.onupgradeneeded=()=>r.result.createObjectStore('drafts');
  r.onsuccess=()=>{
   const db=r.result,tx=db.transaction('drafts','readwrite');
   tx.objectStore('drafts').put('5:3','A');
   tx.oncomplete=()=>{db.close();resolve();};
   tx.onerror=()=>reject(tx.error);
  };
 }));
}
async function get(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('MILFT_MAJ110_INDEX',1);
  r.onerror=()=>reject(r.error);
  r.onupgradeneeded=()=>r.result.createObjectStore('drafts');
  r.onsuccess=()=>{
   const db=r.result,tx=db.transaction('drafts','readonly');
   const q=tx.objectStore('drafts').get('A');
   q.onsuccess=()=>resolve(q.result??null);
   q.onerror=()=>reject(q.error);
   tx.oncomplete=()=>db.close();
  };
 }));
}
async function main(){
 guard();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'milft110-'));
 let server,browser;
 try{
  const key=path.join(tmp,'key.pem'),cert=path.join(tmp,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
   '-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost',
   '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
   if(req.url!=='/preflight'){res.writeHead(404).end('Not found');return;}
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'"}).end(html);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  assert.equal(server.address().address,'127.0.0.1');
  const url='https://127.0.0.1:'+server.address().port+'/preflight';
  browser=await browserType.launch({headless:true});
  const strict=await browser.newContext({serviceWorkers:'block'});
  try{
   const page=await strict.newPage();
   await assert.rejects(()=>page.goto(url,{timeout:8000}), /certificate|cert|SSL|TLS|authority|ERR_|net::/i,
    'Un vrai appareil ne doit pas ignorer la confiance TLS');
  }finally{await strict.close();}
  // Une exception de confiance existe seulement dans le banc CI éphémère.
  const first=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  const second=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true});
  let forbidden=0;
  for(const context of [first,second]){
   await context.route('**/*',route=>{
    if(route.request().url()===url)return route.continue();
    forbidden++;return route.abort();
   });
  }
  try{
   const a=await first.newPage(),b=await first.newPage(),c=await second.newPage();
   await Promise.all([a.goto(url),b.goto(url),c.goto(url)]);
   for(const page of [a,b,c]){
    const state=await page.evaluate(()=>({
     secure:isSecureContext,protocol:location.protocol,host:location.hostname,
     locks:typeof navigator.locks?.request==='function',
     local:typeof localStorage.setItem==='function',
     idb:typeof indexedDB.open==='function'
    }));
    assert.deepEqual(state,{secure:true,protocol:'https:',host:'127.0.0.1',locks:true,local:true,idb:true});
   }
   await a.evaluate(()=>localStorage.setItem('MILFT110_LOCAL','one'));
   assert.equal(await b.evaluate(()=>localStorage.getItem('MILFT110_LOCAL')),'one');
   assert.equal(await c.evaluate(()=>localStorage.getItem('MILFT110_LOCAL')),null);
   await put(a);
   assert.equal(await get(b),'5:3');
   assert.equal(await get(c),null);
   await a.evaluate(()=>{
    window.started=false;
    window.held=navigator.locks.request('MILFT110_LOCK',async()=>{
     window.started=true;
     await new Promise(resolve=>window.release=resolve);
    });
   });
   await a.waitForFunction(()=>window.started);
   await b.evaluate(()=>{
    window.second=false;
    window.queued=navigator.locks.request('MILFT110_LOCK',()=>{window.second=true;});
   });
   await b.waitForFunction(async()=>{
    const locks=await navigator.locks.query();
    return locks.pending.some(x=>x.name==='MILFT110_LOCK');
   });
   assert.equal(await b.evaluate(()=>window.second),false,'Concurrent tab cannot enter while lock held');
   await a.evaluate(()=>window.release());
   await b.waitForFunction(()=>window.second===true);
   await Promise.all([a.evaluate(()=>window.held),b.evaluate(()=>window.queued)]);
   // MAJ111 : un onglet détenteur disparaît avant de libérer son verrou.
   // Le navigateur doit libérer le bail Web Locks et l'autre onglet doit
   // pouvoir progresser, sans perdre les données locales persistantes.
   const crashed=await first.newPage();
   await crashed.goto(url);
   await crashed.evaluate(()=>{
    window.holding=false;
    window.lockForever=navigator.locks.request('MILFT111_CRASH_LOCK',async()=>{
     window.holding=true;
     await new Promise(()=>{});
    });
   });
   await crashed.waitForFunction(()=>window.holding===true);
   await b.evaluate(()=>{
    window.recovered=false;
    window.afterCrash=navigator.locks.request('MILFT111_CRASH_LOCK',()=>{
     window.recovered=true;
    });
   });
   await b.waitForFunction(async()=>{
    const q=await navigator.locks.query();
    return q.pending.some(x=>x.name==='MILFT111_CRASH_LOCK');
   });
   assert.equal(await b.evaluate(()=>window.recovered),false,
    'Second tab cannot pass while first holds crash lock');
   await crashed.close();
   await b.waitForFunction(()=>window.recovered===true,{timeout:15000});
   await b.evaluate(()=>window.afterCrash);
   assert.equal(await get(b),'5:3','IndexedDB survives closure of another tab');
   assert.equal(await b.evaluate(()=>localStorage.getItem('MILFT110_LOCAL')),'one',
    'localStorage survives closure of another tab');
   await b.reload();
   const stateAfterReload=await b.evaluate(()=>({
    secure:isSecureContext,locks:typeof navigator.locks?.request==='function',
    saved:localStorage.getItem('MILFT110_LOCAL')
   }));
   assert.deepEqual(stateAfterReload,{secure:true,locks:true,saved:'one'});
   assert.equal(await get(b),'5:3','IndexedDB survives explicit reload');
   assert.equal(forbidden,0,'No external URLs may be fetched');
   console.log('OK MAJ110 '+flavor+': HTTPS réel loopback, TLS strict, Web Locks exclusifs, IndexedDB/localStorage isolés, aucun accès LAN/Firebase');
  }finally{await Promise.allSettled([first.close(),second.close()]);}
 }finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
