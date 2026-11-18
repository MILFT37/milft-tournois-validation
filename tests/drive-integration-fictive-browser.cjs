'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const HTML='drive-integration-fictive.html';
let next=10000000;
const folders=[],archives=[],writes=[];
const respond=(value,status=200)=>({status,contentType:'application/json',body:JSON.stringify(value)});
function server(){
 const svc=http.createServer((req,res)=>{
  const rel=new URL(req.url,'http://localhost').pathname;
  const full=path.resolve(ROOT,'.'+rel);
  if(!full.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(full,(e,data)=>{
   if(e){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':path.extname(full)==='.html'?'text/html':'application/javascript','Cache-Control':'no-store'}).end(data);
  });
 });
 return new Promise(resolve=>svc.listen(0,'127.0.0.1',()=>resolve({svc,url:'http://127.0.0.1:'+svc.address().port+'/'+HTML})));
}
(async()=>{
 const {svc,url}=await server(), browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext();
  await context.addInitScript(()=>{
   window.__MILFT_DRIVE_BROWSER_TEST__=true;
   window.google={accounts:{oauth2:{initTokenClient:({callback})=>({requestAccessToken:()=>callback({access_token:'fake-milft-fixture',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'})}),revoke:()=>{}}}};
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({body:'// google GIS mock',status:200}));
  await page.route(/^https:\/\/www.googleapis.com\/(upload\/)?drive\/v3\/files/,async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();
   assert.equal(req.headers().authorization,'Bearer fake-milft-fixture');
   if(url.pathname==='/drive/v3/files'&&method==='GET'){
    const query=url.searchParams.get('q')||'';
    if(query.includes('mimeType =')){
     const name=query.match(/name = '([^']+)'/)?.[1];
     const parent=query.match(/'([^']+)' in parents/)?.[1];
     return route.fulfill(respond({files:folders.filter(x=>x.name===name&&x.parent===(parent==='root'?null:parent)).map(({id,name})=>({id,name}))}));
    }
    const parent=query.match(/'([^']+)' in parents/)?.[1];
    return route.fulfill(respond({files:archives.filter(x=>x.parent===parent).map(({id,name,size,createdTime})=>({id,name,size,createdTime}))}));
   }
   if(url.pathname==='/drive/v3/files'&&method==='POST'){
    const payload=JSON.parse(req.postData()),folder={id:String(next++),name:payload.name,parent:payload.parents?.[0]||null};
    folders.push(folder);writes.push({type:'folder',payload});return route.fulfill(respond(folder));
   }
   if(url.pathname==='/upload/drive/v3/files'&&method==='POST'){
    const body=req.postData(),meta=JSON.parse(body.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n')[1].split('\r\n--milft_')[0]);
    const payload=JSON.parse(body.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n')[2].split('\r\n--milft_')[0]);
    assert.equal(payload.format,'MILFT-TOURNOIS-BACKUP');
    assert.equal(payload.data.players.length,2);
    assert.equal(payload.data.tournaments.length,0);
    assert.equal(meta.parents.length,1);
    const result={id:String(next++),name:meta.name,parent:meta.parents[0],body:payload,createdTime:'2026-11-18T21:00:00Z',size:String(body.length)};
    archives.push(result);writes.push({type:'archive',payload});return route.fulfill(respond(result));
   }
   const id=url.pathname.split('/').at(-1),found=archives.find(x=>x.id===id);
   assert(found);
   return route.fulfill(respond(url.searchParams.get('alt')==='media'?found.body:found));
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#milft-google-connect').waitFor({state:'visible'});
  assert.equal(writes.length,0,'No write on page open');
  assert.equal(await page.locator('#milft-drive-auto').isDisabled(),true,'Fixture auto backups off');
  await page.locator('#milft-google-connect').click();
  assert.match(await page.locator('#milft-google-auth-status').innerText(),/Google connecté à MILFT/);
  assert.equal(writes.length,0,'No write on OAuth authorization');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#milft-drive-save-now').click();
  await page.waitForFunction(()=>document.querySelector('#milft-google-auth-status')?.textContent?.includes('Sauvegarde Drive confirmée'));
  assert.equal(archives.length,1);
  assert.deepEqual(folders.map(x=>x.name),['MILFT Tournois - Essais','Sauvegardes fictives']);
  await page.locator('#milft-drive-list-v11').click();
  await page.locator('#milft-drive-archives button').waitFor({state:'visible'});
  assert.equal(await page.locator('#milft-drive-archives button').count(),1,'Fixture only provides read-only downloads, no restore');
  assert.equal(await page.locator('button').filter({hasText:'Restaurer'}).count(),0,'No destructive restore');
  assert(!errors.length,'Errors: '+errors.join('; '));
  console.log('OK Drive fixture browser: same adapter, fictitious snapshot, isolated folders, no auto or restore, archive list');
 }finally{await browser.close();await new Promise(resolve=>svc.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
