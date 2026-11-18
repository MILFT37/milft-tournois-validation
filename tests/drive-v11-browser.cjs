'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=process.cwd(), HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const KEY='milft_iso_20261102_tournois_v01';
const fixture={players:[],tournaments:[],selected:null};
const archives=[],folders=[],apiCalls=[];
let failUpload=false,nextId=10000000;
const json=(data,status=200)=>({status,contentType:'application/json',body:JSON.stringify(data)});
const valid={format:'MILFT-TOURNOIS-BACKUP',version:1,exportedAt:'2026-11-18T18:00:00Z',data:fixture,planning:{events:[],progress:[]},progressPreferences:{}};
async function serve(){
 const server=http.createServer((req,res)=>{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(ROOT,'.'+requested);
  if(!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const ext=path.extname(target);
   res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.html'?'text/html':ext==='.webmanifest'?'application/manifest+json':'application/octet-stream','Cache-Control':'no-store'}).end(data);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'+HTML};
}
async function main(){
 const {server,url}=await serve();
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(({key,state})=>{
    window.__MILFT_DRIVE_BROWSER_TEST__=true;
    localStorage.setItem(key,JSON.stringify(state));
    window.google={accounts:{oauth2:{initTokenClient:({callback,error_callback})=>({requestAccessToken:()=>{if(window.__MILFT_TEST_OAUTH_POPUP_ERROR__)error_callback({type:'popup_closed'});else if(window.__MILFT_TEST_OAUTH_NO_CALLBACK__)return;else callback({access_token:'fake-token-no-real-google',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});}}),revoke:()=>{}}}};
  },{key:KEY,state:fixture});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({status:200,body:'/* mocked Identity Services */'}));
  await page.route(/^https:\/\/www.googleapis.com\/(upload\/)?drive\/v3\/files/,async route=>{
    const req=route.request(),u=new URL(req.url()),method=req.method();
    assert.equal(req.headers()['authorization'],'Bearer fake-token-no-real-google');
    apiCalls.push({method,path:u.pathname,query:u.searchParams.get('q')});
    if(u.pathname==='/drive/v3/files'&&method==='GET'){
      const q=u.searchParams.get('q')||'';
      if(q.includes('mimeType =')) {
        const parent=q.match(/'([^']+)' in parents/)?.[1];
        const name=q.match(/name = '([^']+)'/)?.[1];
        const found=folders.filter(f=>f.name===name&&f.parent===(parent==='root'?undefined:parent));
        return route.fulfill(json({files:found}));
      }
      const parent=q.match(/'([^']+)' in parents/)?.[1];
      return route.fulfill(json({files:archives.filter(a=>a.parent===parent).map(({id,name,createdTime,size})=>({id,name,createdTime,size}))}));
    }
    if(u.pathname==='/drive/v3/files'&&method==='POST'){
      const body=JSON.parse(req.postData()),folder={id:String(nextId++),name:body.name,parent:body.parents?.[0]};
      folders.push(folder);return route.fulfill(json(folder));
    }
    if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
      if(failUpload)return route.fulfill(json({error:'denied'},403));
      const data=req.postData(),name=data.match(/"name":"(MILFT_TOURNOIS_[^"]+)"/)?.[1],
        parent=data.match(/"parents":\["([^"]+)"\]/)?.[1],
        payload=data.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n').at(-1).split('\r\n--milft_')[0];
      assert(name&&parent&&payload,'complete archive submitted');
      const parsed=JSON.parse(payload);assert.equal(parsed.format,'MILFT-TOURNOIS-BACKUP');
      const record={id:String(nextId++),name,parent,body:payload,createdTime:'2026-11-18T18:00:00Z',size:String(payload.length)};
      archives.push(record);return route.fulfill(json(record));
    }
    const id=u.pathname.split('/').at(-1),found=archives.find(x=>x.id===id);
    if(!found)throw Error('Unknown mock Drive request '+req.url());
    if(u.searchParams.get('alt')==='media')return route.fulfill({status:200,contentType:'application/json',body:found.body});
    return route.fulfill(json(found));
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#milft-settings-toggle').click();
  await page.locator('.settings-backup > summary').click();
  await page.locator('.milft-technical-details > summary').click();
  await page.locator('#milft-google-connect').waitFor({state:'visible'});
  assert.equal(await page.locator('#milft-google-connect').count(),1,'Drive panel available');
  assert.equal(await page.locator('#milft-drive-save-now').isDisabled(),true,'No action without Google consent');
  assert.equal(apiCalls.length,0,'No API call before consent');
  const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
  // Android regression: a popup can close without sending an OAuth access token.
  await page.evaluate(()=>{window.__MILFT_TEST_OAUTH_POPUP_ERROR__=true;});
  await page.locator('#milft-google-connect').click();
  assert.match(await page.locator('#milft-google-auth-status').innerText(),/fenêtre Google s’est fermée/);
  assert.equal(await page.locator('#milft-drive-save-now').isDisabled(),true,'No save after popup failure');
  assert.equal(apiCalls.length,0,'No Drive request after popup failure');
  // Google's authorization screen can be dismissed without invoking either callback.
  await page.evaluate(()=>{window.__MILFT_TEST_OAUTH_POPUP_ERROR__=false;window.__MILFT_TEST_OAUTH_NO_CALLBACK__=true;});
  await page.locator('#milft-google-connect').click();
  await page.evaluate(()=>MILFTDriveV11Test ? undefined : undefined); // no remote operation
  await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));});
  // Advance the OAuth timeout via virtual clock to avoid waiting 30 seconds.
  await page.clock.install();
  await page.clock.fastForward(30010);
  assert.match(await page.locator('#milft-google-auth-status').innerText(),/RETOUR GOOGLE ABSENT/);
  assert.equal(await page.locator('#milft-drive-save-now').isDisabled(),true,'No saving on absent callback');
  await page.evaluate(()=>{window.__MILFT_TEST_OAUTH_NO_CALLBACK__=false;});
  await page.locator('#milft-google-connect').click();
  assert.match(await page.locator('#milft-google-auth-status').innerText(),/Google connecté/);
  assert.equal(apiCalls.length,0,'Connecting alone cannot write Drive');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#milft-drive-save-now').click();
  await page.waitForFunction(()=>document.querySelector('#milft-google-auth-status')?.textContent?.includes('Sauvegarde Drive confirmée'));
  assert.equal(archives.length,1,'One archive created');
  assert.equal(folders.length,2,'Visible Drive folder tree');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before,'Local state unchanged by backup');
  await page.locator('#milft-drive-list-v11').click();
  await page.waitForFunction(()=>document.querySelectorAll('#milft-drive-archives button').length===2);
  assert.equal(await page.locator('#milft-drive-archives button').count(),2,'Download and protected restore offered');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#milft-drive-archives button').nth(1).click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before,'Restore aborted without overwrite');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#milft-drive-save-now').click();
  await page.waitForFunction(()=>document.querySelector('#milft-google-auth-status')?.textContent?.includes('confirmée'));
  assert.equal(archives.length,2,'Backups are immutable and distinct');
  failUpload=true;
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#milft-drive-save-now').click();
  await page.waitForFunction(()=>document.querySelector('#milft-google-auth-status')?.textContent?.includes('Drive non sauvegardé'));
  assert.equal(archives.length,2,'Denied upload preserved prior backups');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before,'Failure cannot erase local data');
  assert(!errors.length,'Browser errors: '+errors.join('; '));
  console.log('OK Drive browser isolated: OAuth mock, manual archives, listing, abort restore, failed upload, local data intact');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
