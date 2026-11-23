'use strict';
// MAJ98 — gardes contre brouillons corrompus, stockages refusés et acquittements tardifs.
// Test autonome sans connexion réseau ou Firebase.
const assert=require('node:assert/strict');
(async()=>{
 const {readDraft,saveDraft,discardDraftIfSame}=await import('../v2/draft-multimatch-emulator.mjs');
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
 console.log('OK MAJ98: draft scopes, denied storage, stale receipt, corrupted records and no unwanted deletion');
})().catch(error=>{console.error(error);process.exitCode=1;});
