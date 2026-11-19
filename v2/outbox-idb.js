/* MILFT V2 — Prototype IndexedDB isolé : aucune API réseau, aucune clé V1.1. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root&&root.document)root.MILFTV2Outbox=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DEFAULT_DB='MILFT_V2_ISOLATED_OUTBOX_20261119', STORE='commands', RECEIPTS='receipts';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const TYPES=new Set(['table.assign','table.release','set.record','match.validate','match.forfeit','match.reopen']);
const clone=x=>JSON.parse(JSON.stringify(x));
function validId(x,label){if(typeof x!=='string'||!ID.test(x))throw Error(label+' invalide');return x;}
function version(x,label){if(!Number.isSafeInteger(x)||x<0)throw Error(label+' invalide');return x;}
function scopeOf(raw){
 if(!raw||typeof raw!=='object')throw Error('Portée absente');
 return {tournamentId:validId(raw.tournamentId,'tournoi'),actorId:validId(raw.actorId,'auteur'),deviceId:validId(raw.deviceId,'appareil')};
}
function scopeKey(raw){const x=scopeOf(raw);return JSON.stringify([x.tournamentId,x.actorId,x.deviceId]);}
function itemKey(scope,id){return JSON.stringify([scopeKey(scope),validId(id,'événement')]);}
function normalizeCommand(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Commande absente');
 const cmd={id:validId(raw.id,'événement'),...scopeOf(raw),matchId:validId(raw.matchId,'match'),type:raw.type,expectedVersion:version(raw.expectedVersion,'version du match')};
 if(!TYPES.has(cmd.type))throw Error('Opération inconnue');
 if(cmd.type.startsWith('table.')){cmd.tableId=validId(raw.tableId,'table');cmd.expectedTableVersion=version(raw.expectedTableVersion,'version de table');}
 if(cmd.type==='set.record'){
  if(!Number.isSafeInteger(raw.setIndex)||raw.setIndex<0||raw.setIndex>4)throw Error('Index de manche invalide');
  if(![raw.goals?.a,raw.goals?.b].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=99))throw Error('Buts invalides');
  cmd.setIndex=raw.setIndex;cmd.goals={a:raw.goals.a,b:raw.goals.b};
 }
 if(cmd.type==='match.forfeit'){if(!['a','b'].includes(raw.winner))throw Error('Gagnant forfait invalide');cmd.winner=raw.winner;}
 return cmd;
}
function open({indexedDB,dbName=DEFAULT_DB}={}){
 if(!indexedDB||typeof indexedDB.open!=='function')return Promise.reject(Error('IndexedDB indisponible : modifications à conserver'));
 if(typeof dbName!=='string'||!/^MILFT_V2_[A-Za-z0-9_-]{1,90}$/.test(dbName))return Promise.reject(Error('Base non isolée'));
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('byScope','scope',{unique:false});}
   if(!db.objectStoreNames.contains(RECEIPTS))db.createObjectStore(RECEIPTS,{keyPath:'key'});
  };
  req.onerror=()=>reject(req.error||Error('Ouverture IndexedDB échouée'));
  req.onblocked=()=>reject(Error('Ouverture bloquée : autre onglet à fermer sans effacer la file'));
  req.onsuccess=()=>{
   const db=req.result;db.onversionchange=()=>db.close();
   let closed=false;
   function tx(names,mode,operation){
    if(closed)return Promise.reject(Error('Base fermée'));
    return new Promise((ok,fail)=>{
     let tr;try{tr=db.transaction(names,mode);}catch(e){fail(e);return;}
     let result;
     tr.oncomplete=()=>ok(clone(result));
     tr.onabort=()=>fail(tr.error||Error('Transaction annulée ; brouillon conservé'));
     try{operation(tr,x=>{result=x;});}catch(e){tr.abort();fail(e);}
    });
   }
   function enqueue(scope,raw,now=Date.now()){
    const s=scopeOf(scope),cmd=normalizeCommand(raw);
    if(cmd.tournamentId!==s.tournamentId||cmd.actorId!==s.actorId||cmd.deviceId!==s.deviceId)throw Error('Commande hors portée');
    if(!Number.isFinite(now)||now<0)throw Error('Horodatage invalide');
    const key=itemKey(s,cmd.id),fingerprint=JSON.stringify(cmd);
    return tx([STORE,RECEIPTS],'readwrite',(tr,done)=>{
     const receipt=tr.objectStore(RECEIPTS).get(key);
     receipt.onsuccess=()=>{
      if(receipt.result){done({status:receipt.result.fingerprint===fingerprint?'already-confirmed':'id-collision'});return;}
      const get=tr.objectStore(STORE).get(key);
      get.onsuccess=()=>{
       if(get.result){done({status:get.result.fingerprint===fingerprint?'duplicate':'id-collision'});return;}
       tr.objectStore(STORE).add({key,scope:scopeKey(s),command:cmd,fingerprint,state:'pending',createdAt:now,updatedAt:now,attempts:0,leaseToken:null,leaseUntil:0,reason:null});
       done({status:'queued'});
      };
     };
    });
   }
   function list(scope){
    const key=scopeKey(scope);
    return tx([STORE],'readonly',(tr,done)=>{
     const req=tr.objectStore(STORE).index('byScope').getAll(key);
     req.onsuccess=()=>done(req.result.sort((a,b)=>a.createdAt-b.createdAt||a.key.localeCompare(b.key)));
    });
   }
   function claimNext(scope,{now=Date.now(),leaseMs=30000}={}){
    const key=scopeKey(scope);
    if(!Number.isFinite(now)||now<0||!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>300000)throw Error('Bail invalide');
    return tx([STORE],'readwrite',(tr,done)=>{
     const cursorReq=tr.objectStore(STORE).index('byScope').openCursor(key);
     cursorReq.onsuccess=()=>{
      const cursor=cursorReq.result;if(!cursor){done(null);return;}
      const item=cursor.value;
      if(item.state==='pending'||item.state==='sending'&&item.leaseUntil<=now){
       item.state='sending';item.leaseToken=String(now)+'-'+Math.random().toString(36).slice(2)+'-'+item.attempts;
       item.leaseUntil=now+leaseMs;item.updatedAt=now;item.attempts++;
       cursor.update(item);done(item);
      }else cursor.continue();
     };
    });
   }
   function finish(scope,eventId,leaseToken,outcome,{now=Date.now(),reason=''}={}){
    const key=itemKey(scope,eventId);
    if(typeof leaseToken!=='string'||leaseToken.length<5)throw Error('Bail absent');
    if(!['applied','duplicate','conflict','forbidden','temporary-error'].includes(outcome))throw Error('Statut distant inconnu : aucune suppression');
    if(!Number.isFinite(now)||now<0)throw Error('Horodatage invalide');
    return tx([STORE,RECEIPTS],'readwrite',(tr,done)=>{
     const store=tr.objectStore(STORE),req=store.get(key);
     req.onsuccess=()=>{
      const item=req.result;
      if(!item){done({status:'missing'});return;}
      if(item.state!=='sending'||item.leaseToken!==leaseToken){done({status:'stale-lease'});return;}
      if(outcome==='applied'||outcome==='duplicate'){
       tr.objectStore(RECEIPTS).put({key,fingerprint:item.fingerprint,confirmedAt:now,outcome});
       store.delete(key);done({status:'confirmed'});return;
      }
      item.state=outcome==='conflict'?'conflict':outcome==='forbidden'?'blocked':'pending';
      item.reason=String(reason).slice(0,180)||outcome;item.leaseToken=null;item.leaseUntil=0;item.updatedAt=now;
      store.put(item);done({status:item.state});
     };
    });
   }
   async function stats(scope){
    const items=await list(scope),count={pending:0,sending:0,conflict:0,blocked:0};
    for(const item of items)count[item.state]++;
    return count;
   }
   function close(){closed=true;db.close();}
   resolve({enqueue,list,claimNext,finish,stats,close,dbName});
  };
 });
}
return {open,scopeKey,normalizeCommand,DEFAULT_DB};
});