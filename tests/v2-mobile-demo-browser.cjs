'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const type=process.env.MILFT_BROWSER==='webkit'?'webkit':'chromium';
const engine={chromium,webkit}[type];
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(!['/v2/mobile-demo.html','/v2/mobile-demo.mjs','/v2/firebase-config.mjs','/v2/outbox-idb.js'].includes(route)){res.writeHead(404).end('Not found');return;}
 // Fixture intentionally disabled: browser isolation test must never contact real Firebase.
 if(route==='/v2/firebase-config.mjs'){
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end('export const firebaseConfig = null;\n');
  return;
 }
 const file=path.join(process.cwd(),route);
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Missing');return;}res.writeHead(200,{'Content-Type':route.endsWith('.html')?'text/html':route.endsWith('.mjs')?'text/javascript':'application/javascript','Cache-Control':'no-store'}).end(data);});
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,external=[];
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:type==='chromium',hasTouch:type==='chromium'});
  const page=await context.newPage();
  page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
  await page.goto(origin+'/v2/mobile-demo.html');
  await page.locator('#status').getByText('Projet Firebase non configuré', {exact:false}).waitFor();
  assert.equal(await page.locator('#signIn').isDisabled(),true);
  assert.equal(await page.locator('#copyUid').isDisabled(),true);
  assert.equal(await page.locator('#copyTrial').isDisabled(),true);
  assert.equal(await page.locator('#copyLink').isDisabled(),true);
  assert.equal(await page.locator('#copyConflicts').isDisabled(),true);
  assert.equal(await page.locator('#conflictFallback').isHidden(),true);
  assert.equal(await page.locator('#rooms').isHidden(),true);
  assert.equal(await page.locator('#demo').isHidden(),true);
  assert.equal(await page.locator('#sharing').isHidden(),true);
  assert.match(await page.title(),/Partage V2/);
  assert.deepEqual(external,[],'No outbound connection without project configuration');
  const identityBefore=await page.evaluate(()=>({
    device:localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID'),
    session:sessionStorage.getItem('MILFT_V2_DEVICE_ID')
  }));
  assert.match(identityBefore.device,/^device[a-f0-9]{24}$/,'V2 device identity must persist in localStorage');
  assert.equal(identityBefore.session,null,'No ephemeral session-scoped device identity');
  const isolated=await page.evaluate(async()=>{
    const prod=localStorage.getItem('milft_iso_20261102_tournois_v01');
    const prototype=window.MILFTV2Outbox;
    const db=await prototype.open({indexedDB,dbName:'MILFT_V2_SMOKE_71'});
    const scope={tournamentId:'trial1234567890abcd',actorId:'android1',deviceId:'phoneA'};
    const cmd={...scope,id:'evt-test',matchId:'demo',type:'set.record',expectedVersion:0,setIndex:0,goals:{a:5,b:3}};
    const enqueue=await db.enqueue(scope,cmd);
    const items=await db.list(scope);db.close();
    return {prod,enqueue,items:items.length};
  });
  assert.equal(isolated.prod,null,'No V1.1 data touched');
  assert.equal(isolated.enqueue.status,'queued');
  assert.equal(isolated.items,1);
  await page.reload();
  assert.equal(await page.evaluate(()=>localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')),
    identityBefore.device,'V2 device ID stable across page reload');
  assert.deepEqual(await page.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_SMOKE_71'});
    const items=await db.list({tournamentId:'trial1234567890abcd',actorId:'android1',deviceId:'phoneA'});
    db.close();return items.map(x=>x.command.id);
  }),['evt-test'],'IndexedDB outbox persists across reload');
  // A newly opened browser context on the same device should still recover ID
  // and pending commands when the browser profile is preserved.
  const oldDevice=await page.evaluate(()=>localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID'));
  await page.close();
  const reopened=await context.newPage();
  await reopened.goto(origin+'/v2/mobile-demo.html');
  assert.equal(await reopened.evaluate(()=>localStorage.getItem('MILFT_V2_DEMO_DEVICE_ID')),
    oldDevice,'V2 device ID persists after closing tab');
  assert.deepEqual(await reopened.evaluate(async()=>{
    const db=await MILFTV2Outbox.open({indexedDB,dbName:'MILFT_V2_SMOKE_71'});
    const items=await db.list({tournamentId:'trial1234567890abcd',actorId:'android1',deviceId:'phoneA'});
    db.close();return items.map(x=>x.command.id);
  }),['evt-test'],'V2 draft persists after closing tab');
  await context.close();
  console.log('OK MAJ75 mobile UI '+type+': Firebase disabled by test fixture, no outbound calls, no V1 storage, durable draft after reload');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
