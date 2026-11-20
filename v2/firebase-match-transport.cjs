'use strict';
// MAJ 70: transport de test V2, sans connexion ni configuration Firebase intégrée.
// Adaptateur au SDK RTDB injecté; UNIQUEMENT 'set.record' (aucune bascule en production).
const {normalize}=require('./operations-core.cjs');
function createTransport({database,auth,sdk}){
  if(!database||!auth||!sdk||!['ref','runTransaction','onValue','get'].every(k=>typeof sdk[k]==='function'))throw Error('Adaptateur Firebase incomplet');
  function uid(){return auth.currentUser?.uid||null}
  function path(c){return 'tournaments/'+c.tournamentId+'/matches/'+c.matchId}
  function fingerprint(c){return JSON.stringify([c.tournamentId,c.matchId,c.actorId,c.deviceId,c.expectedVersion,c.setIndex,c.goals.a,c.goals.b])}
  async function execute(raw){
    const c=normalize(raw),user=uid();
    if(c.type!=='set.record')return {status:'unsupported',reason:'Seule la saisie de manche est testée dans ce jalon'};
    if(!user||user!==c.actorId)return {status:'forbidden',reason:'Identité authentifiée différente de la commande'};
    const fp=fingerprint(c);
    if(fp.length>500)throw Error('Empreinte trop longue');
    let lastReason='conflict';
    const matchRef=sdk.ref(database,path(c));
    try{
      // Le SDK RTDB peut proposer null au premier passage si le cache est froid.
      // Lire d'abord la valeur du serveur évite de conclure à tort « match absent ».
      const initial=await sdk.get(matchRef);
      if(!initial?.exists?.())return {status:'missing'};
      const result=await sdk.runTransaction(matchRef,current=>{
        if(!current||typeof current!=='object'){lastReason='missing';return;}
        if(current.lastEventId===c.id){
          lastReason=current.lastEventFingerprint===fp?'duplicate':'id-collision';return;
        }
        if(!Number.isSafeInteger(current.version)||current.version!==c.expectedVersion){lastReason='conflict';return;}
        if(current.status!=='playing'){lastReason='invalid-transition';return;}
        const oldSets=current.sets||{};
        if(typeof oldSets!=='object'){lastReason='invalid-transition';return;}
        const indices=Object.keys(oldSets).filter(x=>/^[0-4]$/.test(x));
        if(c.setIndex>indices.length){lastReason='invalid-transition';return;}
        const nextSets={...oldSets,[String(c.setIndex)]:{a:c.goals.a,b:c.goals.b}};
        lastReason='proposed';
        return {...current,sets:nextSets,version:current.version+1,updatedBy:user,lastEventId:c.id,lastEventFingerprint:fp};
      },{applyLocally:false});
      const data=result.snapshot?.val?.();
      if(result.committed){
        // Ne jamais acquitter sans preuve de lecture de la valeur confirmée.
        if(data?.lastEventId===c.id&&data?.lastEventFingerprint===fp&&data.version===c.expectedVersion+1)return {status:'applied',version:data.version};
        return {status:'unverified'};
      }
      if(data?.lastEventId===c.id)return {status:data.lastEventFingerprint===fp?'duplicate':'id-collision'};
      return {status:lastReason==='proposed'?'conflict':lastReason};
    }catch(e){
      const code=String(e?.code||'').toLowerCase();
      if(code.includes('permission-denied'))return {status:'forbidden',reason:'Règles serveur : accès refusé'};
      return {status:'unavailable',reason:'Accusé distant absent : modification conservée'};
    }
  }
  function watch(tournamentId,matchId,onUpdate,onError){
    const val={tournamentId,matchId}; // la validation s'effectue dans normalize pour l'écriture
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(val.tournamentId)||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(val.matchId))throw Error('Portée invalide');
    if(typeof onUpdate!=='function')throw Error('Récepteur requis');
    return sdk.onValue(sdk.ref(database,'tournaments/'+tournamentId+'/matches/'+matchId),snap=>onUpdate(snap.val()),onError);
  }
  async function transmitOne(outbox,scope){
    if(!outbox||!['claimNext','finish'].every(k=>typeof outbox[k]==='function'))throw Error('File persistante absente');
    const job=await outbox.claimNext(scope);
    if(!job)return {status:'idle'};
    const response=await execute(job.command);
    const mapping={applied:'applied',duplicate:'duplicate',conflict:'conflict',forbidden:'forbidden','id-collision':'forbidden'};
    const outcome=mapping[response.status]||'temporary-error';
    const final=await outbox.finish(scope,job.command.id,job.leaseToken,outcome,{reason:response.status});
    return {status:response.status,queueState:final.status,commandId:job.command.id};
  }
  return {execute,watch,transmitOne};
}
module.exports={createTransport};
