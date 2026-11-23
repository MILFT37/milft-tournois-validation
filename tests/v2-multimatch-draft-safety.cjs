'use strict';
// MAJ98 — gardes contre brouillons corrompus, stockages refusés et acquittements tardifs.
// Test autonome sans connexion réseau ou Firebase.
const assert=require('node:assert/strict');
(async()=>{
 const {readDraft,saveDraft,discardDraftIfSame,saveDraftIfCurrent,withDraftLock}=await import('../v2/draft-multimatch-emulator.mjs');
 class FakeStorage{
  constructor(){this.values=new Map();this.failRead=false;this.failWrite=false;this.failRemove=false;}
  getItem(k){if(this.failRead)throw Error('storage read denied');return this.values.get(k)??null;}
  setItem(k,v){if(this.failWrite)throw Error('storage full');this.values.set(k,v);}
  removeItem(k){if(this.failRemove)throw Error('remove denied');this.values.delete(k);}
 }
 const store=new FakeStorage(),scope={tournamentId:'trial1234567890123456',actorId:'owner98',deviceId:'device98'};
 const otherRoom={...scope,tournamentId:'trial1234567890123457'};
 const otherUser={...scope,actorId:'other98'};
 const otherDevice={...scope,deviceId:'device99'};
 const draft=(token,a='5',b='3')=>({a,b,baseVersion:1,format:'belle5',token});
 const a=draft('draftA');
 saveDraft(store,scope,'matchA',a);
 assert.deepEqual(readDraft(store,scope,'matchA','belle5'),a);
 assert.equal(readDraft(store,scope,'matchB','belle5'),null,'distinct match');
 assert.equal(readDraft(store,otherRoom,'matchA','belle5'),null,'distinct room');
 assert.equal(readDraft(store,otherUser,'matchA','belle5'),null,'distinct account');
 assert.equal(readDraft(store,otherDevice,'matchA','belle5'),null,'distinct device');
 assert.throws(()=>readDraft(store,scope,'matchA','partie7'),/non conforme/);
 assert.equal(discardDraftIfSame(store,scope,'matchA','draftWrong'),false,'stale receipt');
 const b=draft('draftB','8','7');
 saveDraft(store,scope,'matchA',b);
 assert.equal(discardDraftIfSame(store,scope,'matchA','draftA'),false,'late receipt cannot erase newer edit');
 assert.deepEqual(readDraft(store,scope,'matchA','belle5'),b);
 store.failWrite=true;
 assert.throws(()=>saveDraft(store,scope,'matchA',draft('draftC')),/storage full/);
 store.failWrite=false;
 assert.deepEqual(readDraft(store,scope,'matchA','belle5'),b,'failed write leaves last saved draft');
 store.failRead=true;assert.throws(()=>readDraft(store,scope,'matchA','belle5'),/read denied/);
 store.failRead=false;
 store.failRemove=true;assert.throws(()=>discardDraftIfSame(store,scope,'matchA','draftB'),/remove denied/);
 store.failRemove=false;
 assert.equal(discardDraftIfSame(store,scope,'matchA','draftB'),true);
 assert.equal(readDraft(store,scope,'matchA','belle5'),null);
 store.setItem('MILFT_V2_MULTI_EMULATOR_DRAFT97_'+JSON.stringify([scope.tournamentId,scope.actorId,scope.deviceId,'matchC']),'{invalid');
 assert.throws(()=>readDraft(store,scope,'matchC','belle5'),/illisible/);
 assert.equal(store.values.size,1,'corrupted draft never erased implicitly');
 // MAJ100 : verrou multi-onglets, CAS sur le jeton antérieur, refus si indisponible.
 const tails=new Map();
 const locks={request:(name,opts,operation)=>{
  assert.equal(opts.mode,'exclusive');
  const prior=tails.get(name)||Promise.resolve();
  const job=prior.catch(()=>{}).then(operation);
  tails.set(name,job.catch(()=>{}));
  return job;
 }};
 assert.rejects(saveDraftIfCurrent(store,null,scope,'matchA',null,draft('fail')),/Verrou inter-onglets indisponible/);
 const first=draft('draftInit','5','1');
 assert.equal((await saveDraftIfCurrent(store,locks,scope,'matchA',null,first)).status,'saved');
 const [a100,b100]=await Promise.all([
  saveDraftIfCurrent(store,locks,scope,'matchA','draftInit',draft('draftTabA','5','2')),
  saveDraftIfCurrent(store,locks,scope,'matchA','draftInit',draft('draftTabB','5','3'))
 ]);
 assert.deepEqual([a100.status,b100.status],['saved','stale'],'only first tab can replace expected token');
 assert.equal(readDraft(store,scope,'matchA','belle5').token,'draftTabA');
 assert.equal((await saveDraftIfCurrent(store,locks,scope,'matchA','draftTabA',draft('draftTabB','5','3'))).status,'saved');
 let release;
 const inLock=withDraftLock(locks,scope,'matchA',()=>new Promise(resolve=>{release=resolve;}));
 // Wait until the holder actually enters the critical section.
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const second=saveDraftIfCurrent(store,locks,scope,'matchA','draftTabB',draft('draftTabC'));
 release('done');
 assert.equal(await inLock,'done');
 assert.equal((await second).status,'saved');
 assert.equal(readDraft(store,scope,'matchA','belle5').token,'draftTabC');
 assert.equal(discardDraftIfSame(store,scope,'matchA','draftTabB'),false,'Old receipt cannot clear newer token');
 console.log('OK MAJ98: draft scopes, denied storage, stale receipt, corrupted records and no unwanted deletion');
})().catch(error=>{console.error(error);process.exitCode=1;});
