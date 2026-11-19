'use strict';
// Prototype V2.0 ISOLÉ : aucun accès réseau, aucun stockage de production.
// Ce module modélise uniquement les règles de conflits et une file fictive.
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const ROLES=new Set(['admin','editor','viewer']);
const clone=x=>JSON.parse(JSON.stringify(x));
function validId(value,label){
  if(typeof value!=='string'||!ID.test(value))throw Error(label+' invalide');
}
function validCommand(cmd){
  if(!cmd||typeof cmd!=='object')throw Error('Commande absente');
  for(const key of ['id','tournamentId','matchId','actorId','deviceId'])validId(cmd[key],key);
  if(!Number.isSafeInteger(cmd.expectedVersion)||cmd.expectedVersion<0)throw Error('Version attendue invalide');
  if(!cmd.score||typeof cmd.score!=='object'||Array.isArray(cmd.score))throw Error('Score non structuré');
  const json=JSON.stringify(cmd.score);
  if(!json||json.length>32768)throw Error('Score volumineux ou non sérialisable');
  return clone({id:cmd.id,tournamentId:cmd.tournamentId,matchId:cmd.matchId,
    actorId:cmd.actorId,deviceId:cmd.deviceId,expectedVersion:cmd.expectedVersion,
    score:cmd.score});
}
function newWorkspace(id,ownerId,matchIds){
  validId(id,'tournoi');validId(ownerId,'propriétaire');
  if(!Array.isArray(matchIds)||matchIds.length===0)throw Error('Au moins un match');
  const matches={};
  for(const matchId of matchIds){
    validId(matchId,'match');
    if(Object.hasOwn(matches,matchId))throw Error('Match en double');
    matches[matchId]={version:0,score:null,lastEventId:null,updatedBy:null};
  }
  return {id,members:{[ownerId]:'admin'},matches,receipts:{}};
}
function grantRole(workspace,userId,role){
  validId(userId,'utilisateur');
  if(!ROLES.has(role))throw Error('Rôle invalide');
  const next=clone(workspace);next.members[userId]=role;return next;
}
function eventFingerprint(cmd){
  return JSON.stringify([cmd.tournamentId,cmd.matchId,cmd.actorId,cmd.deviceId,
    cmd.expectedVersion,cmd.score]);
}
function submit(workspace,rawCommand){
  const cmd=validCommand(rawCommand);
  if(cmd.tournamentId!==workspace.id)return {status:'unknown-tournament',workspace};
  const role=workspace.members?.[cmd.actorId];
  if(role!=='admin'&&role!=='editor')return {status:'forbidden',workspace};
  const current=workspace.matches?.[cmd.matchId];
  if(!current)return {status:'unknown-match',workspace};
  const existing=workspace.receipts?.[cmd.id],fingerprint=eventFingerprint(cmd);
  if(existing){
    return {status:existing===fingerprint?'duplicate':'id-collision',workspace};
  }
  if(cmd.expectedVersion!==current.version){
    return {status:'conflict',workspace,current:clone(current),draft:clone(cmd)};
  }
  const next=clone(workspace),match=next.matches[cmd.matchId];
  match.version++;match.score=clone(cmd.score);
  match.lastEventId=cmd.id;match.updatedBy=cmd.actorId;
  next.receipts[cmd.id]=fingerprint;
  return {status:'applied',workspace:next,current:clone(match)};
}
function enqueue(outbox,rawCommand){
  if(!Array.isArray(outbox))throw Error('File locale invalide');
  const cmd=validCommand(rawCommand);
  const previous=outbox.find(x=>x.id===cmd.id);
  if(previous&&eventFingerprint(previous)!==eventFingerprint(cmd))throw Error('Collision de commande locale');
  return previous?clone(outbox):[...clone(outbox),cmd];
}
function flush(workspace,outbox){
  if(!Array.isArray(outbox))throw Error('File locale invalide');
  let current=clone(workspace);
  const pending=[],reports=[];
  for(const command of outbox){
    const result=submit(current,command);
    reports.push({eventId:command.id,status:result.status,
      current:result.status==='conflict'?result.current:undefined});
    current=result.workspace;
    if(!['applied','duplicate'].includes(result.status))pending.push(clone(command));
  }
  return {workspace:current,pending,reports};
}
module.exports={newWorkspace,grantRole,submit,enqueue,flush};
