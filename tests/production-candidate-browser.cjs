'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const candidate=path.resolve('candidate-production-v11');
const app='MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html';
async function main(){
  const serve=http.createServer((req,res)=>{
    const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
    const file=path.resolve(candidate,relative);
    if(!file.startsWith(candidate+path.sep)){res.writeHead(403).end();return;}
    try{
      const data=fs.readFileSync(file);
      res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.webmanifest')?'application/manifest+json':'image/png'});
      res.end(data);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>serve.listen(0,'127.0.0.1',resolve));
  const port=serve.address().port;
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    let created=0,uploaded=null;
    const folders=[],files=[];
    let counter=10000000;
    const ok=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)});
    await page.addInitScript(()=>{
      window.__MILFT_DRIVE_BROWSER_TEST__=true;
      window.google={accounts:{oauth2:{
        initTokenClient:({callback})=>({requestAccessToken:()=>callback({access_token:'synthetic-token',scope:'https://www.googleapis.com/auth/drive.file',expires_in:3600})}),
        revoke:(token,cb)=>cb?.()
      }}};
    });
    await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({status:200,body:'/* tested OAuth injection */'}));
    await page.route(/^https:\/\/www.googleapis.com\/(upload\/)?drive\/v3\/files/,async route=>{
      const req=route.request(),url=new URL(req.url()),q=url.searchParams.get('q')||'',method=req.method();
      assert.equal(req.headers().authorization,'Bearer synthetic-token','Only synthetic token used');
      if(url.pathname==='/drive/v3/files'&&method==='GET'){
        if(q.includes('mimeType =')){
          const name=q.match(/name = '([^']+)'/)?.[1],parent=q.match(/'([^']+)' in parents/)?.[1];
          return route.fulfill(ok({files:folders.filter(f=>f.name===name&&(!parent||f.parent===parent))}));
        }
        const parent=q.match(/'([^']+)' in parents/)?.[1];
        return route.fulfill(ok({files:files.filter(f=>f.parent===parent).map(({id,name,createdTime,size})=>({id,name,createdTime,size}))}));
      }
      if(url.pathname==='/drive/v3/files'&&method==='POST'){
        const body=JSON.parse(req.postData()),record={id:String(counter++),name:body.name,parent:body.parents?.[0]};
        folders.push(record);return route.fulfill(ok(record));
      }
      if(url.pathname==='/upload/drive/v3/files'&&method==='POST'){
        const body=req.postData();
        const name=body.match(/"name":"(MILFT_TOURNOIS_[^"]+)"/)?.[1];
        const parent=body.match(/"parents":\["([^"]+)"\]/)?.[1];
        const text=body.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n').at(-1).split('\r\n--milft_')[0];
        uploaded=JSON.parse(text);
        assert.equal(uploaded.format,'MILFT-TOURNOIS-BACKUP');
        assert.equal(uploaded.data.players.length,2);
        assert.equal(uploaded.data.tournaments.length,1);
        const record={id:String(counter++),name,parent,createdTime:new Date().toISOString(),size:String(text.length),body:text};
        created++;files.push(record);return route.fulfill(ok(record));
      }
      const id=url.pathname.split('/').at(-1),file=files.find(x=>x.id===id);
      assert(file,'Unknown mock archive');
      if(url.searchParams.get('alt')==='media')return route.fulfill({status:200,contentType:'application/json',body:file.body});
      return route.fulfill(ok(file));
    });
    await page.goto('http://127.0.0.1:'+port+'/'+app,{waitUntil:'domcontentloaded'});
    assert.equal(await page.evaluate(()=>window.MILFTDriveV11Enabled),true,'Production candidate panel enabled only in isolated test');
    const state=await page.evaluate(()=>{
      const prodKey='milft_prod_v11_20261117_tournois_v01';
      db.players=[{id:'p1',first:'FICTIF',last:'A'},{id:'p2',first:'FICTIF',last:'B'}];
      db.tournaments=[{id:'test-one',name:'TEST ISOLÉ',mode:'challenge',discipline:'single',closed:false,roster:[],matches:[],tables:[]}];
      db.selected=null;
      save();
      return {key:prodKey,snapshot:localStorage.getItem(prodKey)};
    });
    await page.locator('#milft-settings-toggle').click();
    await page.locator('.settings-backup > summary').click();
    await page.locator('.milft-technical-details > summary').click();
    await page.locator('#milft-google-connect').waitFor({state:'visible'});
    assert.equal(await page.locator('#milft-drive-save-now').isDisabled(),true,'No Drive writes before opt-in');
    await page.locator('#milft-google-connect').click();
    assert.match(await page.locator('#milft-google-auth-status').innerText(),/Google connecté à MILFT/);
    assert.equal(created,0,'OAuth alone does not write an archive');
    page.once('dialog',async dialog=>{
      assert.match(dialog.message(),/2 joueur\(s\) et 1 enregistrement\(s\)/,'Snapshot summary before upload');
      await dialog.accept();
    });
    await page.locator('#milft-drive-save-now').click();
    await page.waitForFunction(()=>document.querySelector('#milft-google-auth-status')?.textContent?.includes('Sauvegarde Drive confirmée'));
    assert.equal(created,1,'One fictional backup created only in the mocked Drive');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),state.key),state.snapshot,'Production storage unchanged by backup');
    await page.locator('#milft-drive-list-v11').click();
    await page.getByText(/MILFT_TOURNOIS_manuel_/).first().waitFor();
    assert.equal(await page.locator('#milft-drive-archives .item').count(),1,'Remote synthetic archive readable');
    assert.deepEqual(errors,[],'No browser script exceptions');
    console.log('OK candidate production: isolated storage, OAuth, consent, synthetic backup and archive reading; no real Drive accessed');
  }finally{await browser.close();await new Promise(resolve=>serve.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
