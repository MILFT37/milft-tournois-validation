const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html','utf8');
const extract=name=>{
 const i=html.indexOf('function '+name+'(');
 assert(i>=0,'Fonction '+name+' absente');
 const e=html.indexOf('\nfunction ',i+11);
 return html.slice(i,e<0?undefined:e);
};
const start=html.indexOf('async function milftImportBackup(');
const end=html.indexOf('\n// V0.46 - paramètres indépendants',start);
assert(start>=0&&end>start,'Import JSON absent');
const source=html.slice(start,end);
const boot=[
 "const KEY='test:db',PLAN_KEY='test:plan',MILFT_PROGRESS_PREFS='test:prefs';",
 "const initial={players:[{id:'keep',first:'Sauve',last:'Intact'}],tournaments:[{id:'existing',mode:'poules',roster:[],tables:[],matches:[]}]};",
 "const stored=new Map([[KEY,JSON.stringify(initial)],[PLAN_KEY,'{\"events\":[],\"progress\":[]}'],[MILFT_PROGRESS_PREFS,'{}']]);",
 "let db=JSON.parse(JSON.stringify(initial)),plan={events:[],progress:[]},progressPrefs={},tab='dashboard',notice='',writeFail=false;",
 "const alerts=[],confirmations=[];",
 "const localStorage={getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>{if(writeFail&&k===PLAN_KEY){writeFail=false;throw Error('Storage quota simulated');}stored.set(k,v);},removeItem:k=>stored.delete(k)};",
 "const Blob=class Blob{constructor(parts){this.parts=parts;}};",
 "const URL={createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}};",
 "const document={body:{appendChild:()=>{}},createElement:()=>({click:()=>{},remove:()=>{}})};",
 "const window={scrollTo:()=>{},dispatchEvent:()=>{}};",
 "const Event=class Event{constructor(type){this.type=type;}};",
 "const setTimeout=()=>{};",
 "const confirm=message=>{confirmations.push(message);return true;};",
 "const alert=message=>alerts.push(message);",
 "const render=()=>{},normalizeFirst=s=>s,normalizeLast=s=>s;",
 "function milftMigrateLegacyBackup(data){return JSON.parse(JSON.stringify(data));}",
 "async function milftPreserverAvantRestauration(){return {source:'simule',previousCount:1,recoveredCount:null};}"
].join('\n');
const result="return {run:milftImportBackup,setWriteFailure:failure=>writeFail=failure,current:()=>JSON.parse(JSON.stringify(db)),stored:()=>Object.fromEntries(stored),alerts,confirmations};";
const factory=new Function(boot+'\n'+extract('milftBackupEventRootId')+'\n'+extract('milftBackupLinkedTableOccupied')+'\n'+source+'\n'+result);
const clone=x=>JSON.parse(JSON.stringify(x));
const players=['P1','P2'].map(id=>({id,first:id,last:'Test'}));
const roster=players.map(p=>({...p})),table=[{id:1,state:'playing'}];
const pools={id:'root',name:'Demo',mode:'poules',finalId:'A',finalBId:'B',finalPhase:true,roster,matches:[],tables:clone(table)};
const a={id:'A',sourceId:'root',name:'Demo - A',mode:'knockout',bracketLetter:'A',roster,
 matches:[{id:'mA',a:'P1',b:'P2',table:1,status:'playing',sets:[{a:5,b:3}],startedAt:123}],tables:clone(table)};
const b={id:'B',sourceId:'root',name:'Demo - B',mode:'knockout',bracketLetter:'B',roster,matches:[],tables:clone(table)};
const payload={format:'MILFT-TOURNOIS-BACKUP',version:1,data:{players,tournaments:[pools,a,b],selected:'A'},
 planning:{events:[],progress:[]},progressPreferences:{foo:true}};
const run=(h,p)=>h.run({files:[{size:1200,text:async()=>JSON.stringify(p)}],value:'selected'});
async function main(){
 {
  const h=factory();await run(h,payload);
  assert.strictEqual(h.alerts.length,0,'Restauration valide refusee : '+h.alerts.join('; '));
  assert.strictEqual(h.current().tournaments.length,3,'Phases A/B disparues');
  assert.strictEqual(h.current().tournaments[1].matches[0].sets[0].a,5,'Manches alterees');
  assert.strictEqual(JSON.parse(h.stored()['test:db']).tournaments.length,3,'Persistance incomplete');
  assert.strictEqual(h.confirmations.length,3,'Confirmations inattendues');
  console.log('OK JSON : restauration A/B et manches conservees');
 }
 {
  const h=factory(),invalid=clone(payload);
  invalid.data.tournaments[1].matches=[];
  invalid.data.tournaments[0].tables[0].state='free';
  invalid.data.tournaments[1].tables[0].state='free';
  const old=JSON.stringify(h.stored());await run(h,invalid);
  assert.strictEqual(JSON.stringify(h.stored()),old,'Import incoherent a ecrase les donnees');
  assert.strictEqual(h.alerts.length,1,'Import incoherent non refuse');
  assert(h.alerts[0].includes('Table indiquée occupée'),'Cause du refus incorrecte');
  assert.strictEqual(h.confirmations.length,0,'Le rejet doit preceder les confirmations');
  console.log('OK JSON : occupation incoherente rejetee sans ecriture');
 }
 {
  const h=factory();h.setWriteFailure(true);
  const old=JSON.stringify(h.stored());await run(h,payload);
  assert.strictEqual(JSON.stringify(h.stored()),old,'Retour arriere absent');
  assert.strictEqual(h.current().tournaments[0].id,'existing','Base locale modifiee');
  assert(h.alerts.length===1&&h.alerts[0].includes('Storage quota simulated'),'Erreur de stockage non signalee');
  console.log('OK JSON : erreur de stockage et retour arriere');
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});