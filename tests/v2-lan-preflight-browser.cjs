'use strict';
// MILFT Tournois V2 MAJ108 — preuve de faisabilite LAN, aucune ouverture reseau.
// Ce test ne contacte ni Firebase reel, ni Google, ni une adresse du LAN.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.MILFT_BROWSER==='webkit'?webkit:chromium;
const ROOT=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const CHECK_URL='http://192.168.50.20:8048/lan-preflight';
const HTML='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LAN MILFT isolé</title></head><body><h1>Précontrôle local uniquement</h1></body></html>';
function guardStatic(){
 const source=read('v2/mobile-multimatch-emulator.mjs');
 const deploy=read('.github/workflows/milft-pages-deploy.yml');
 const cfg=JSON.parse(read('firebase.v2.multimatch.emulator.json'));
 assert(source.includes("['127.0.0.1','localhost','::1'].includes(location.hostname)"),
  'Le prototype doit rester borne a loopback');
 assert(source.includes('navigator.locks'),'Le protocole des brouillons requiert Web Locks');
 assert(!deploy.includes('mobile-multimatch-emulator.html'),
  'Interdiction de publier le prototype multi-match sur GitHub Pages');
 assert(!deploy.includes('outbox-multimatch-emulator.js'),
  'Interdiction de publier la file multi-match');
 for(const svc of ['auth','database'])assert.equal(cfg.emulators[svc].host,'127.0.0.1');
}
async function main(){
 guardStatic();
 // Le serveur est explicitement lie a loopback, jamais a 0.0.0.0 ou au LAN.
 const server=http.createServer((req,res)=>{
  if(req.url!=='/lan-preflight'){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(HTML);
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 let browser;
 try{
  const local='http://127.0.0.1:'+server.address().port+'/lan-preflight';
  browser=await engine.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block'});
  let blocked=0,simulated=0;
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url===local)return route.continue();
   // L'IP LAN est une ORIGINE FICTIVE: Playwright fournit les octets localement.
   // Aucune requete n'est envoyee a cette IP.
   if(url===CHECK_URL){
    simulated++;
    return route.fulfill({status:200,contentType:'text/html',body:HTML});
   }
   blocked++;
   return route.abort();
  });
  const p=await context.newPage();
  await p.goto(local,{waitUntil:'load'});
  const localState=await p.evaluate(()=>({
   protocol:location.protocol,hostname:location.hostname,
   secure:isSecureContext,lock:typeof navigator.locks?.request==='function'
  }));
  assert.equal(localState.hostname,'127.0.0.1');
  assert.equal(localState.secure,true,'Loopback doit etre un contexte de confiance');
  assert.equal(localState.lock,true,'Web Locks obligatoire pour les brouillons');
  await p.goto(CHECK_URL,{waitUntil:'load'});
  const lanState=await p.evaluate(()=>({
   protocol:location.protocol,hostname:location.hostname,
   secure:isSecureContext,lock:typeof navigator.locks?.request==='function'
  }));
  assert.equal(lanState.hostname,'192.168.50.20');
  assert.equal(lanState.protocol,'http:');
  assert.equal(lanState.secure,false,
   'Une URL HTTP LAN privee ne doit PAS etre consideree sure');
  assert.equal(lanState.lock,false,
   'Web Locks ne doit PAS etre utilisable en HTTP LAN non sur');
  assert.equal(simulated,1,'L origine LAN doit etre interceptee une fois et jamais contactee');
  assert.equal(blocked,0,'Aucune requete hors de la liste controlee');
  await context.close();
  console.log('OK MAJ108 '+(process.env.MILFT_BROWSER||'chromium')+
   ' : loopback securise; HTTP LAN non securise; Web Locks absent sur HTTP LAN; aucun paquet sur le LAN');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
