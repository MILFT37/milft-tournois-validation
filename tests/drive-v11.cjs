'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('milft-drive-v11-validation.js','utf8');
const ctx={module:{exports:{}},TextEncoder,URLSearchParams,console,Math,Date,JSON};
ctx.globalThis=ctx;vm.runInNewContext(src,ctx,{filename:'milft-drive-v11-validation.js'});
const {createDriveClient}=ctx.module.exports;
assert.equal(typeof createDriveClient,'function');

const calls=[], files=new Map();
let counter=0, failUpload=false;
async function fakeFetch(url,opts={}) {
  calls.push({url:String(url),method:opts.method||'GET',authorization:opts.headers?.Authorization});
  const method=opts.method||'GET', u=new URL(String(url));
  const ok=(data)=>({ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)});
  if(u.pathname==='/drive/v3/files'&&method==='GET') {
    const q=u.searchParams.get('q')||'';
    if(q.includes('mimeType =')) {
      if(q.includes("'root' in parents"))return ok({files:Array.from(files.values()).filter(f=>f.mimeType==='application/vnd.google-apps.folder'&&!f.parent)});
      const parent=q.match(/'([^']+)' in parents/)?.[1];
      return ok({files:Array.from(files.values()).filter(f=>f.mimeType==='application/vnd.google-apps.folder'&&f.parent===parent)});
    }
    const parent=q.match(/'([^']+)' in parents/)?.[1];
    return ok({files:Array.from(files.values()).filter(f=>f.parent===parent&&f.mimeType==='application/json').map(({id,name,createdTime,size})=>({id,name,createdTime,size}))});
  }
  if(u.pathname==='/drive/v3/files'&&method==='POST'){
    const metadata=JSON.parse(opts.body),id='filefolder'+(++counter);
    files.set(id,{id,name:metadata.name,mimeType:metadata.mimeType,parent:metadata.parents?.[0]||null});
    return ok({id,name:metadata.name});
  }
  if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
    if(failUpload)return {ok:false,status:403,text:async()=>'quota',json:async()=>({})};
    const m=opts.body.match(/"name":"(MILFT_TOURNOIS_[^"]+)"/);
    assert(m,'archive name must be supplied');
    const name=m[1],parent=opts.body.match(/"parents":\["([^"]+)"\]/)?.[1];
    assert(parent,'archive requires visible folder parent');
    const id='drivearchive'+(++counter);
    const data=opts.body.split('\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n').at(-1).split('\r\n--milft_')[0];
    assert(data,'archive JSON multipart body');
    JSON.parse(data);
    files.set(id,{id,name,mimeType:'application/json',parent,createdTime:'2026-11-18T17:00:00Z',size:String(data.length),body:data});
    return ok({id,name,size:String(data.length)});
  }
  const id=u.pathname.split('/').at(-1),f=files.get(id);
  if(f&&method==='GET'){
    if(u.searchParams.get('alt')==='media')return {ok:true,status:200,text:async()=>f.body};
    return ok({id:f.id,name:f.name,size:f.size,createdTime:f.createdTime});
  }
  throw Error('Unexpected request '+method+' '+url);
}

(async()=>{
 const noToken=createDriveClient(fakeFetch,()=>null);
 await assert.rejects(noToken.list(),/autorisation|Connexion|Google/i);
 assert.equal(calls.length,0,'No network request without Google authorization');
 const client=createDriveClient(fakeFetch,()=>'fake-test-token');
 const snapshot={format:'MILFT-TOURNOIS-BACKUP',version:1,exportedAt:'2026-11-18T17:00:00Z',data:{players:[],tournaments:[]},planning:{events:[],progress:[]},progressPreferences:{}};
 const first=await client.upload(snapshot,'manuel');
 assert(first.id&&first.name.startsWith('MILFT_TOURNOIS_manuel_'));
 const second=await client.upload(snapshot,'automatique');
 assert.notEqual(first.id,second.id,'Separate backups must have different IDs');
 assert.equal((await client.list()).length,2,'Both archives preserved');
 const recovered=await client.download(first.id);
 assert.equal(JSON.stringify(recovered.data),JSON.stringify(snapshot),'Complete roundtrip');
 assert.equal(files.get(first.id).body,JSON.stringify(snapshot),'First backup untouched by later upload');
 failUpload=true;
 await assert.rejects(client.upload(snapshot,'manuel'),/403/);
 assert.equal((await client.list()).length,2,'Failed upload does not delete archives');
 assert(calls.every(c=>c.authorization==='Bearer fake-test-token'),'OAuth token only used in Authorization header');
 assert.equal((await client.backupFolder(false)),files.get(first.id).parent);
 console.log('OK Drive V1.1: authorization, visible folders, immutable snapshots, roundtrip, failure non-destructive');
})().catch(e=>{console.error(e);process.exitCode=1;});
