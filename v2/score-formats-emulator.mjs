// MAJ96 — module de validation de chaque score final, ESSAIS EMULES uniquement.
// Le 0–0 initial d'un match n'est pas un résultat.
export const formatLabels=Object.freeze({
  manche5:'Manche en 5 points',
  partie7:'Partie en 7 points (6–6 possible)',
  partie8:'Partie en 8 points (7–7 possible)',
  belle5:'Belle à deux points d’écart (plafond 8–7)'
});
export function validScore(format,a,b){
  if(!Object.hasOwn(formatLabels,format)||!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||a>8||b>8)return false;
  const hi=Math.max(a,b),lo=Math.min(a,b);
  if(format==='manche5')return hi===5&&lo<=4;
  if(format==='partie7')return hi===7&&lo<=6||(a===6&&b===6);
  if(format==='partie8')return hi===8&&lo<=7||(a===7&&b===7);
  if(format==='belle5')return hi===5&&lo<=3||hi===6&&lo===4||hi===7&&lo===5||hi===8&&(lo===6||lo===7);
  return false;
}
