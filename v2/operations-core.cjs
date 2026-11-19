'use strict';
// Prototype V2 isolé, sans réseau, Drive, ni stockage de production.
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const copy=x=>JSON.parse(JSON.stringify(x));
function ident(x){if(typeof x!=='string'||!ID.test(x))throw Error('ID invalide');return x}
function num(x){if(!Number.isSafeInteger(x)||x<0)throw Error('Version invalide');return x}
function init(tournamentId,ownerId,matchIds,tableIds){
  ident(tournamentId);ident(ownerId);
  if(!matchIds?.length||!tableIds?.length||new Set(matchIds).size!==matchIds.length||new Set(tableIds).size!==tableIds.length)throw Error('Liste invalide');
  return {id:tournamentId,members:{[ownerId]:'admin'},matches:Object.fromEntries(matchIds.map(x=>[ident(x),{version:0,status:'ready',sets:[],tableId:null,forfeit:null}])),tables:Object.fromEntries(tableIds.map(x=>[ident(x),{version:0,matchId:null}])),receipts:{},history:[]};
}
function grant(s,auth,target,role){
  if(s.members[auth]!=='admin')return {status:'forbidden',state:s};
  ident(target);if(!['admin','editor','viewer'].includes(role))throw Error('Rôle invalide');
  const next=copy(s);next.members[target]=role;return {status:'applied',state:next};
}
function normalize(raw){
  if(!raw||typeof raw!=='object')throw Error('Commande absente');
  const c={id:ident(raw.id),tournamentId:ident(raw.tournamentId),matchId:ident(raw.matchId),actorId:ident(raw.actorId),deviceId:ident(raw.deviceId),type:raw.type,expectedVersion:num(raw.expectedVersion)};
  if(!['table.assign','table.release','set.record','match.validate','match.forfeit','match.reopen'].includes(c.type))throw Error('Opération inconnue');
  if(c.type.startsWith('table.')){c.tableId=ident(raw.tableId);c.expectedTableVersion=num(raw.expectedTableVersion)}
  if(c.type==='set.record'){
    if(!Number.isInteger(raw.setIndex)||raw.setIndex<0||raw.setIndex>4)throw Error('Manche invalide');
    if(![raw.goals?.a,raw.goals?.b].every(n=>Number.isInteger(n)&&n>=0&&n<=99))throw Error('Buts invalides');
    c.setIndex=raw.setIndex;c.goals={a:raw.goals.a,b:raw.goals.b};
  }
  if(c.type==='match.forfeit'){if(!['a','b'].includes(raw.winner))throw Error('Forfait invalide');c.winner=raw.winner}
  return c;
}
function apply(s,auth,raw){
  ident(auth);const c=normalize(raw),reject=status=>({status,state:s});
  if(c.tournamentId!==s.id)return reject('unknown-tournament');
  // L'identité authentifiée est indépendante du champ actorId, contrôlé ici.
  if(c.actorId!==auth||!['admin','editor'].includes(s.members[auth]))return reject('forbidden');
  const m=s.matches[c.matchId];if(!m)return reject('unknown-match');
  const fp=JSON.stringify(c);
  if(Object.hasOwn(s.receipts,c.id))return reject(s.receipts[c.id]===fp?'duplicate':'id-collision');
  if(m.version!==c.expectedVersion)return {status:'conflict',state:s,current:copy(m)};
  const table=c.tableId&&s.tables[c.tableId];
  if(c.tableId&&!table)return reject('unknown-table');
  if(table&&table.version!==c.expectedTableVersion)return {status:'conflict',state:s,current:copy(table)};
  const next=copy(s),match=next.matches[c.matchId];
  function release(){
    if(!match.tableId)return;
    const t=next.tables[match.tableId];
    if(t.matchId!==c.matchId)throw Error('Invariant table rompu');
    t.matchId=null;t.version++;match.tableId=null;
  }
  switch(c.type){
    case 'table.assign':
      if(table.matchId!==null)return reject('table-busy');
      if(match.tableId||!['ready','playing'].includes(match.status))return reject('invalid-transition');
      next.tables[c.tableId].matchId=c.matchId;next.tables[c.tableId].version++;
      match.tableId=c.tableId;match.status='playing';break;
    case 'table.release':
      if(match.tableId!==c.tableId||table.matchId!==c.matchId)return reject('invalid-transition');
      release();break;
    case 'set.record':
      if(!['ready','playing'].includes(match.status)||c.setIndex>match.sets.length)return reject('invalid-transition');
      match.sets[c.setIndex]=c.goals;match.status='playing';break;
    case 'match.validate':
      if(match.status!=='playing'||!match.sets.length)return reject('invalid-transition');
      match.status='done';release();break;
    case 'match.forfeit':
      if(!['ready','playing'].includes(match.status))return reject('invalid-transition');
      match.status='forfeit';match.forfeit={winner:c.winner,score:c.winner==='a'?{a:5,b:3}:{a:3,b:5}};release();break;
    case 'match.reopen':
      if(!['done','forfeit'].includes(match.status))return reject('invalid-transition');
      match.status=match.sets.length?'playing':'ready';match.forfeit=null;break;
  }
  match.version++;next.receipts[c.id]=fp;
  next.history.push({eventId:c.id,type:c.type,matchId:c.matchId,actorId:auth,deviceId:c.deviceId,version:match.version});
  return {status:'applied',state:next};
}
function enqueue(queue,raw){if(!Array.isArray(queue))throw Error('File invalide');const c=normalize(raw),old=queue.find(x=>x.id===c.id);if(old&&JSON.stringify(old)!==JSON.stringify(c))throw Error('Collision');return old?copy(queue):[...copy(queue),c]}
function flush(s,auth,queue){let state=copy(s);const pending=[],reports=[];for(const c of queue){const result=apply(state,auth,c);reports.push({id:c.id,status:result.status});state=result.state;if(!['applied','duplicate'].includes(result.status))pending.push(copy(c))}return {state,pending,reports}}
module.exports={init,grant,normalize,apply,enqueue,flush};
