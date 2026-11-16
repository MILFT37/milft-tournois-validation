/* Recette fictive : refuser un import avec la meme table A/B occupee simultanement.
 * Ne contient aucune sauvegarde ni aucun nom de joueur reel. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd(),HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
async function serve(){
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||HTML;
  const file=path.resolve(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'}).end(data);});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,url:'http://127.0.0.1:'+server.address().port+'/'+HTML};
}
async function main(){
 const {server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const alerts=[],confirmations=[];
   window.alert=message=>alerts.push(String(message));
   window.confirm=message=>{confirmations.push(String(message));return true;};
   const players=Array.from({length:8},(_,i)=>({id:'F'+i,first:'Fictif',last:'J'+i}));
   const rootId='COLLISION-ROOT';
   const phase=(letter,indices)=>({
    id:'COLLISION-'+letter,name:'Fictif — Tableau '+letter,mode:'knockout',
    bracketLetter:letter,sourceId:rootId,discipline:'single',date:'2026-11-16',
    roster:indices.map(i=>players[i]),tables:[{id:2,state:'playing'}],closed:false,
    matches:[{id:'LIVE-'+letter,a:players[indices[0]].id,b:players[indices[1]].id,
      status:'playing',round:0,table:2,sets:letter==='B'?[{a:5,b:3}]:[],
      score:null,startedAt:Date.now()}]
   });
   const root={id:rootId,name:'Fictif',mode:'poules',discipline:'single',
    finalId:'COLLISION-A',finalBId:'COLLISION-B',date:'2026-11-16',
    roster:players,tables:[{id:2,state:'playing'}],closed:true,matches:[]};
   db={players,tournaments:[],selected:null};save();
   const before=localStorage.getItem('milft_iso_20261102_tournois_v01');
   const payload={format:'MILFT-TOURNOIS-BACKUP',version:1,
    data:{players,tournaments:[root,phase('A',[0,1]),phase('B',[2,3])],selected:'COLLISION-A'},
    planning:{events:[],progress:[]},progressPreferences:{}};
   const setsBefore=JSON.stringify(payload.data.tournaments[2].matches[0].sets);
   const file=new File([JSON.stringify(payload)],'collision-fictive.json',{type:'application/json'});
   await milftImportBackup({files:[file],value:'collision-fictive.json'});
   return {alerts,confirmations,before,after:localStorage.getItem('milft_iso_20261102_tournois_v01'),
    setsUnchanged:JSON.stringify(payload.data.tournaments[2].matches[0].sets)===setsBefore};
  });
  assert.equal(result.confirmations.length,0,'Collision non rejetee AVANT confirmations');
  assert.equal(result.before,result.after,'Collision a ecrase les donnees existantes');
  assert.equal(result.setsUnchanged,true,'Manche B modifiee');
  assert(result.alerts.some(a=>a.includes('Table 2')&&a.includes('simultanément')),
   'Diagnostic de collision A/B absent : '+result.alerts.join(' | '));
  assert.deepEqual(errors,[],'Erreur JavaScript : '+errors.join('; '));
  console.log('OK : conflit reel A/B table 2 bloque avant confirmation, stockage inchange, manche B 5-3 intacte');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
