/* MILFT V1.1 : recette de compatibilite WebKit, sur navigateur et donnees fictifs.
 * Ce test ne pretend PAS valider Safari sur un iPhone physique. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {webkit}=require('playwright');

const ROOT=process.cwd();
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
function startServer(){
 const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch{res.writeHead(400).end();return;}
  const rel=pathname==='/'?'index.html':pathname.slice(1);
  const file=path.resolve(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const ext=path.extname(file).toLowerCase();
   const type=ext==='.html'?'text/html; charset=utf-8':
    ext==='.js'?'application/javascript':
    ext==='.webmanifest'||ext==='.json'?'application/json':
    ext==='.png'?'image/png':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
  });
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   server,base:'http://127.0.0.1:'+server.address().port+'/'
  }));
 });
}
async function main(){
 const {server,base}=await startServer();
 let browser,context;
 try{
  browser=await webkit.launch({headless:true});
  context=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
   acceptDownloads:true
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForURL(url=>url.pathname.endsWith('/'+HTML),{timeout:15000});
  await page.waitForSelector('#tabs button');
  assert.match(await page.title(),/MILFT Tournois/);
  const labels=['Accueil','Joueurs','Nouveau tournoi','Tournoi en cours',
   'Historique','Simulation','Avancement'];
  for(const label of labels){
   const tab=page.locator('#tabs button').filter({hasText:label});
   assert.equal(await tab.count(),1,'Onglet WebKit absent : '+label);
   await tab.click();
   assert((await page.locator('#view').innerText()).trim().length>0,
    'Ecran WebKit vide : '+label);
  }
  console.log('OK WebKit : accueil V1.1 et 7 ecrans navigables au toucher');

  const pwa=await page.evaluate(async()=>{
   const manifestUrl=document.querySelector('link[rel="manifest"]')?.href;
   const appleUrl=document.querySelector('link[rel="apple-touch-icon"]')?.href;
   if(!manifestUrl||!appleUrl)return null;
   const manifestResponse=await fetch(manifestUrl);
   const manifest=await manifestResponse.json();
   const checks=await Promise.all([
    ...manifest.icons.map(icon=>new URL(icon.src,manifestUrl).href),appleUrl
   ].map(async url=>{
    const response=await fetch(url);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const size=bytes.length>24?[
     (bytes[16]*16777216+bytes[17]*65536+bytes[18]*256+bytes[19]),
     (bytes[20]*16777216+bytes[21]*65536+bytes[22]*256+bytes[23])
    ]:null;
    return {status:response.status,validPng:bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,size};
   }));
   return {status:manifestResponse.status,display:manifest.display,
    startUrl:manifest.start_url,icons:manifest.icons,checks};
  });
  assert(pwa,'Liens manifeste / Apple absents du HTML');
  assert.equal(pwa.status,200,'WebKit : manifeste non servi');
  assert.equal(pwa.display,'standalone','WebKit : affichage PWA non configure');
  assert(pwa.startUrl.endsWith(HTML),'WebKit : ancien point de depart PWA');
  assert.deepEqual(pwa.icons.map(x=>x.sizes).sort(),['192x192','512x512']);
  for(let i=0;i<pwa.checks.length;i++){
   const asset=pwa.checks[i];
   assert.equal(asset.status,200,'WebKit : icone absente n°'+i);
   assert(asset.validPng,'WebKit : icone non PNG n°'+i);
   const expected=i<pwa.icons.length?Number(pwa.icons[i].sizes.split('x')[0]):192;
   assert.deepEqual(asset.size,[expected,expected],'WebKit : dimensions PNG n°'+i);
  }
  console.log('OK WebKit : manifeste, demarrage stable, icones PWA et Apple');

  await page.evaluate(()=>{
   const input=document.createElement('input');input.type='file';
   input.id='milft-webkit-test-file';document.body.appendChild(input);
  });
  await page.locator('#milft-webkit-test-file').setInputFiles({
   name:'sauvegarde-fictive.json',mimeType:'application/json',
   buffer:Buffer.from('{"milftWebkitTest":true}')
  });
  const chosen=await page.evaluate(async()=>{
   const input=document.getElementById('milft-webkit-test-file');
   const file=input.files?.[0];
   const result={name:file?.name,parsed:file?JSON.parse(await file.text()):null};
   input.remove();return result;
  });
  assert.equal(chosen.name,'sauvegarde-fictive.json');
  assert.equal(chosen.parsed?.milftWebkitTest,true,'WebKit : lecture JSON fichier echouee');

  const storage=await page.evaluate(async()=>{
   const key='milft-webkit-smoke-isolated';
   localStorage.setItem(key,'OK');
   const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('MILFT_WEBKIT_SMOKE_FICTIF',1);
    request.onupgradeneeded=()=>{
     if(!request.result.objectStoreNames.contains('checks'))
      request.result.createObjectStore('checks');
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
   });
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('checks','readwrite');
    tx.objectStore('checks').put('OK','candidate');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
   });
   const value=await new Promise((resolve,reject)=>{
    const tx=db.transaction('checks','readonly');
    const request=tx.objectStore('checks').get('candidate');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
   });
   db.close();
   indexedDB.deleteDatabase('MILFT_WEBKIT_SMOKE_FICTIF');
   return {local:localStorage.getItem(key),indexed:value};
  });
  assert.deepEqual(storage,{local:'OK',indexed:'OK'},
   'WebKit : stockage local ou IndexedDB indisponible');
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(()=>{
   const key='milft-webkit-smoke-isolated';
   const value=localStorage.getItem(key);
   localStorage.removeItem(key);
   return value;
  });
  assert.equal(persisted,'OK','WebKit : localStorage non conserve apres rechargement');
  assert.deepEqual(errors,[],'Erreur JavaScript WebKit : '+errors.join(' ; '));
  console.log('OK WebKit : selection JSON, File API, localStorage, IndexedDB, rechargement');
  console.log('LIMITE : WebKit Playwright Linux n atteste ni Safari iPhone natif, ni installation/offline PWA');
 }finally{
  if(context)await context.close();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
