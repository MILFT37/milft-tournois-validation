'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('drive-connexion-android.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.includes('const CLIENT_ID'));
assert.equal(scripts.length,1);
new vm.Script(scripts[0]);
const elements=new Map(['connect','read','write','reset','status'].map(id=>[id,{id,disabled:id==='read'||id==='write',classList:{toggle(){}},textContent:'',onclick:null}]));
const folders=[],archives=[],requests=[];let nextId=10000000;let actionCount=0;
const json=(x,status=200)=>({ok:status===200,status,json:async()=>x});
async function fakeFetch(url,opts={}){
 const u=new URL(url),method=opts.method||'GET';
 assert.equal(opts.headers?.Authorization,'Bearer fictive-test-token');
 requests.push({method,url:u.href});
 if(u.pathname==='/drive/v3/files'&&method==='GET'){
   return json({files:folders});
 }
 if(u.pathname==='/drive/v3/files'&&method==='POST'){
   const folder={id:String(nextId++),name:'MILFT Tournois - Diagnostic'};folders.push(folder);return json(folder);
 }
 if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
   const raw=opts.body;
   assert(raw.includes('Content-Type: application/json; charset=UTF-8'));
   assert(!raw.includes('MILFT-TOURNOIS-BACKUP'),'Must not upload actual backup schema');
   assert(raw.includes('\\r\\n')===false,'Multipart cannot contain literal slash r slash n');
   const name=raw.match(/"name":"(MILFT_TEST_FICTIF_[^"]+)"/)?.[1];
   const data=raw.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n').at(-1).split('\r\n--milft_test_')[0];
   assert(name&&data,'MIME multipart body includes test name and data');
   const parsed=JSON.parse(data);
   assert.equal(parsed.format,'MILFT-DRIVE-DIAGNOSTIC');
   assert.equal(parsed.message,'DONNEES FICTIVES - aucune sauvegarde de tournoi');
   const file={id:String(nextId++),name,data:parsed};archives.push(file);return json(file);
 }
 if(u.pathname.startsWith('/drive/v3/files/')&&method==='GET'){
   const item=archives.find(x=>x.id===u.pathname.split('/').at(-1));
   assert(item);
   return json(item.data);
 }
 throw Error('Unexpected method/path '+method+' '+u.pathname);
}
const context={
 URL,URLSearchParams,Date,Math,JSON,fetch:fakeFetch,setTimeout:()=>1,clearTimeout:()=>{},
 document:{getElementById:id=>elements.get(id)},
 location:{href:'https://milft37.github.io/milft-tournois-validation/drive-connexion-android.html'},
 window:{confirm:()=>true,crypto:{randomUUID:()=>String(++actionCount)+'-fictional-id'}},
 google:{accounts:{oauth2:{initTokenClient:({callback})=>({requestAccessToken:()=>callback({access_token:'fictive-test-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'})})}}}
};
context.window.google=context.google;
vm.runInNewContext(scripts[0],context);
(async()=>{
 assert.equal(requests.length,0,'No Drive network call merely by opening the diagnostic');
 await elements.get('connect').onclick();
 assert.equal(requests.length,0,'Google authorization alone cannot upload');
 assert.equal(elements.get('write').disabled,false);
 await elements.get('write').onclick();
 assert.equal(archives.length,1,'Exactly one fictional test JSON created');
 assert.equal(folders.length,1,'Dedicated diagnostic folder created');
 assert.match(elements.get('status').textContent,/VERT — SAUVEGARDE FICTIVE/);
 assert(requests.every(x=>x.method==='GET'||x.method==='POST'));
 const before=archives[0].data.marker;
 await elements.get('write').onclick();
 assert.equal(archives.length,2,'Second test creates another archive, never overwrites');
 assert.equal(archives[0].data.marker,before,'Previous archive unchanged');
 folders[0].parent='user-moved-location';
 await elements.get('write').onclick();
 assert.equal(folders.length,1,'Dossier diagnostic déplacé réutilisé, aucun doublon à la racine');
 assert.equal(archives.length,3,'Le diagnostic conserve son écriture dans le dossier déplacé');
 console.log('OK diagnostic Android : dossier déplacé réutilisé, sans doublon, archives intactes');
})().catch(e=>{console.error(e);process.exitCode=1});
