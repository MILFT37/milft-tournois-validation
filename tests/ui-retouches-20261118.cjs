/* Recette ciblée des retouches UI, données fictives, sans production. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const HTML='MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html';
const source=fs.readFileSync(HTML,'utf8');
assert.equal((source.match(/class="mutedbtn milft-result-edit"/g)||[]).length,5);
assert.equal((source.match(/settings-panel-icon" aria-hidden/g)||[]).length,3);
assert(!source.includes('MILFT_JOUEURS_REFERENCE_20261014'));
const KEY='milft_iso_20261102_tournois_v01';
const players=Array.from({length:6},(_,i)=>({id:'P'+i,first:'Joueur'+i,last:'TEST'}));
const root={id:'TOUR',name:'Tournoi FICTIF',mode:'challenge',discipline:'single',date:'2026-11-18',
  closed:false,roster:players,matches:[{id:'M1',a:'P0',b:'P1',round:1,status:'done',score:{a:3,b:0},
    sets:[{a:5,b:0},{a:5,b:0},{a:5,b:0}]}],tables:[{id:1,state:'free'}],roundLimit:1};
const fixture={players,tournaments:[root],selected:'TOUR'};
async function check(browser,url,viewport){
 const context=await browser.newContext({viewport});
 await context.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:KEY,data:fixture});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>setTab('players'));
 const add=page.locator('.milft-player-add>summary'), dir=page.locator('.milft-player-directory>summary');
 for(const summary of [add,dir]){
  const css=await summary.evaluate(el=>({before:getComputedStyle(el,'::before').content,marker:getComputedStyle(el,'::marker').content,display:getComputedStyle(el).display}));
  assert.equal(css.display,'flex');
  assert.notEqual(css.before,'none');
 }
 const collapsed=await dir.evaluate(el=>getComputedStyle(el,'::before').transform);
 await dir.click();
 await page.waitForTimeout(230); // Attendre la fin de l'animation du chevron (160ms).
 const expanded=await dir.evaluate(el=>getComputedStyle(el,'::before').transform);
 assert.notEqual(collapsed,expanded,'Chevron does not rotate');
 await page.locator('#milft-settings-toggle').click();
 const panels=page.locator('#milft-settings .settings-panel>summary');
 assert.equal(await panels.count(),3);
 for(let i=0;i<3;i++){
  assert.equal(await panels.nth(i).locator('.settings-panel-icon svg').count(),1,'Icone SVG absente');
 }
 await page.locator('#milft-settings-toggle').click();
 await page.evaluate(()=>{setTab('live');openTournament('TOUR')});
 const buttons=page.locator('#view .milft-result-line>button.milft-result-edit');
 assert.equal(await buttons.count(),1,'Bouton Corriger absent');
 const row=page.locator('#view .milft-result-line').first();
 const geometry=await row.evaluate(el=>{
  const b=el.querySelector('button'),t=el.querySelector('.milft-result-text');
  const br=b.getBoundingClientRect(),rr=el.getBoundingClientRect(),tr=t.getBoundingClientRect();
  return {buttonWidth:br.width,buttonRight:br.right,rowRight:rr.right,textRight:tr.right,
    buttonLeft:br.left,rowWidth:rr.width,grid:getComputedStyle(el).display};
 });
 assert(geometry.buttonWidth>=96&&geometry.buttonWidth<=115,JSON.stringify(geometry));
 assert(geometry.buttonLeft>=geometry.textRight-1,'Le bouton chevauche le resultat');
 assert(geometry.rowRight-geometry.buttonRight<27,'Le bouton nest pas aligne a droite');
 assert.equal(geometry.grid,'grid');
 assert.deepEqual(errors,[],'Erreurs JS '+errors.join(' ; '));
 console.log('OK UI '+viewport.width+'px: chevrons coherents, 3 icones SVG, Corriger compact a droite');
 }finally{await context.close()}
}
(async()=>{
 const server=http.createServer((req,res)=>fs.readFile(HTML,(e,v)=>{if(e){res.writeHead(500).end();return}res.setHeader('Content-Type','text/html;charset=utf8');res.end(v)}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;try{browser=await chromium.launch();let url='http://127.0.0.1:'+server.address().port+'/';
 for(const viewport of [{width:1280,height:800},{width:390,height:844}])await check(browser,url,viewport);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
