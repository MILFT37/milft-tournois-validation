// MILFT Tournois V2 MAJ97 — brouillons NON ENVOYES, localStorage isolé, émulateur uniquement.
// Chaque clef isole salle, identité Firebase, appareil ET match ; jamais de synchronisation réseau.
const PREFIX='MILFT_V2_MULTI_EMULATOR_DRAFT97_';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const VALID_FORMAT=new Set(['manche5','partie7','partie8','belle5']);
function key(scope,matchId){
  if(!scope||![scope.tournamentId,scope.actorId,scope.deviceId,matchId].every(x=>typeof x==='string'&&ID.test(x)))
    throw Error('Portée de brouillon invalide');
  return PREFIX+JSON.stringify([scope.tournamentId,scope.actorId,scope.deviceId,matchId]);
}
function valid(d){
 return d&&typeof d==='object'&&!Array.isArray(d)&&typeof d.a==='string'&&d.a.length<=16&&
   typeof d.b==='string'&&d.b.length<=16&&Number.isSafeInteger(d.baseVersion)&&d.baseVersion>=0&&
   VALID_FORMAT.has(d.format)&&typeof d.token==='string'&&ID.test(d.token);
}
export function readDraft(storage,scope,matchId,format){
 const raw=storage.getItem(key(scope,matchId));
 if(raw===null)return null;
 let data;
 try{data=JSON.parse(raw);}catch{throw Error('Brouillon local illisible (conservé sans suppression)');}
 if(!valid(data)||data.format!==format)throw Error('Brouillon local non conforme au format du match (conservé)');
 return data;
}
export function saveDraft(storage,scope,matchId,data){
 if(!valid(data))throw Error('Brouillon local invalide');
 const k=key(scope,matchId),raw=JSON.stringify(data);
 storage.setItem(k,raw);
 if(storage.getItem(k)!==raw)throw Error('Brouillon non confirmé par le stockage local');
 return data;
}
// Les envois asynchrones ne peuvent effacer une nouvelle saisie du même match.
export function discardDraftIfSame(storage,scope,matchId,token){
 const k=key(scope,matchId),raw=storage.getItem(k);
 if(raw===null)return false;
 let item;
 try{item=JSON.parse(raw);}catch{return false;}
 if(item?.token!==token||typeof token!=='string')return false;
 storage.removeItem(k);
 if(storage.getItem(k)!==null)throw Error('Suppression du brouillon non confirmée');
 return true;
}
