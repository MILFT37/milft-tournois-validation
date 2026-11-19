/* MILFT Tournois V1.1 — Google Drive: candidate production isolée.
   Sauvegardes immuables, dossier visible, OAuth drive.file. Pas de synchronisation temps reel.
   Aucun jeton ni sauvegarde JSON dans le depot. Le mode production reste inchange. */
(function(root) {
'use strict';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BASE = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const MIN_AUTO_MS = 5 * 60 * 1000;
const DEFAULT_AUTO_MINUTES = 15;
const AUTO_INTERVAL_CHOICES = [5,10,15,30,60];
const AUTO_INTERVAL_KEY = 'MILFT_DRIVE_AUTO_INTERVAL_MINUTES';
const AUTO_QUOTA_KEY = 'MILFT_DRIVE_AUTO_QUOTA_V2';
const MAX_DAILY_UPLOADS = 200;
const MAX_BYTES = 30 * 1024 * 1024;
const CLIENT_ID = '974764451814-ojqchmfb9ssca9hvmfhrgrrrirpro8ou.apps.googleusercontent.com';

function createDriveClient(fetchImpl, tokenProvider, options={}) {
  if(typeof fetchImpl!=='function' || typeof tokenProvider!=='function') throw Error('Configuration Drive incomplète');
  const rootFolderName=options.testMode===true?'MILFT Tournois - Essais':'MILFT Tournois';
  const backupFolderName=options.testMode===true?'Sauvegardes fictives':'Sauvegardes';
  let folderId = null;
  async function request(url, options={}, raw=false) {
    const token = await tokenProvider();
    if(!token) throw Error('Autorisation Google absente ou expirée : reconnecte le compte du club');
    const response = await fetchImpl(url, {...options, headers: {...(options.headers||{}), Authorization:'Bearer '+token}});
    if(!response.ok) {
      const description = await response.text().catch(()=> '');
      throw Error('Google Drive HTTP '+response.status+': '+description.slice(0,160));
    }
    return raw ? response.text() : response.status === 204 ? null : response.json();
  }
  async function findFolder(name, parent) {
    const esc=v=>String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    // Les dossiers créés par MILFT restent accessibles via drive.file même
    // lorsqu'ils sont déplacés sous « Appli MILFT / MILFT Tournoi ».
    // Ne pas imposer la racine à la recherche du dossier principal.
    const q="name = '"+esc(name)+"' and mimeType = '"+FOLDER_MIME+"' and trashed = false"+
      (parent?" and '"+esc(parent)+"' in parents":'');
    let pageToken='',found=null;
    for(let page=0;page<20;page++){
      const p=new URLSearchParams({q,fields:'nextPageToken,files(id,name,parents)',pageSize:'100',spaces:'drive'});
      if(pageToken)p.set('pageToken',pageToken);
      const result=await request(BASE+'?'+p);
      if(!Array.isArray(result?.files))throw Error('Liste des dossiers Drive invalide');
      for(const f of result.files){
        if(typeof f?.id!=='string'||f.name!==name)continue;
        if(found&&found!==f.id)throw Error('Plusieurs dossiers « '+name+' » accessibles : aucun choix ni création automatique');
        found=f.id;
      }
      if(!result.nextPageToken)return found;
      if(result.nextPageToken===pageToken)throw Error('Pagination des dossiers Drive incohérente');
      pageToken=result.nextPageToken;
    }
    throw Error('Recherche des dossiers Drive incomplète : aucune création automatique');
  }
  async function createFolder(name,parent) {
    const info = await request(BASE+'?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:FOLDER_MIME,parents:parent?[parent]:undefined})});
    if(!info?.id) throw Error('Création de dossier Drive non confirmée');
    return info.id;
  }
  async function backupFolder(create) {
    if(folderId) return folderId;
    let rootFolder = await findFolder(rootFolderName,null);
    if(!rootFolder && !create) return null;
    if(!rootFolder) rootFolder=await createFolder(rootFolderName);
    let child=await findFolder(backupFolderName,rootFolder);
    if(!child && !create) return null;
    if(!child) child=await createFolder(backupFolderName,rootFolder);
    folderId=child;
    return child;
  }
  async function upload(snapshot,kind='manuel') {
    if(!snapshot||snapshot.format!=='MILFT-TOURNOIS-BACKUP'||snapshot.version!==1 ||
       !Array.isArray(snapshot.data?.players)||!Array.isArray(snapshot.data?.tournaments))
      throw Error('Instantané MILFT invalide : aucun envoi');
    const payload=JSON.stringify(snapshot);
    if(new TextEncoder().encode(payload).length>MAX_BYTES)throw Error('Sauvegarde trop volumineuse : 30 Mo maximum');
    const destination=await backupFolder(true);
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const unique=(root.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)).slice(0,12);
    const name='MILFT_TOURNOIS_'+kind+'_'+stamp+'_'+unique+'.json';
    const metadata={name,mimeType:'application/json',parents:[destination]};
    const boundary='milft_'+Math.random().toString(36).slice(2);
    const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+
      '\r\n--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+payload+
      '\r\n--'+boundary+'--\r\n';
    const created=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',
      {method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    if(!created?.id)throw Error('Création Drive non confirmée : ne pas considérer la sauvegarde comme réussie');
    const verified=await request(BASE+'/'+encodeURIComponent(created.id)+'?fields=id,name,size,createdTime');
    if(verified?.id!==created.id||verified.name!==name)throw Error('Archive créée mais contrôle Drive incomplet : vérifier le dossier');
    return verified;
  }
  async function list() {
    const destination=await backupFolder(false);
    if(!destination) return [];
    const q="'"+destination+"' in parents and name contains 'MILFT_TOURNOIS_' and trashed = false";
    const files=[], seen=new Set();
    let token='';
    for(let page=0;page<20;page++) {
      const p=new URLSearchParams({q,spaces:'drive',fields:'nextPageToken,files(id,name,createdTime,size)',pageSize:'100',orderBy:'createdTime desc'});
      if(token)p.set('pageToken',token);
      const response=await request(BASE+'?'+p);
      if(!Array.isArray(response?.files))throw Error('Historique Drive invalide');
      for(const f of response.files)if(f?.id&&f.name?.startsWith('MILFT_TOURNOIS_')&&!seen.has(f.id)){
        files.push(f);seen.add(f.id);
      }
      if(!response.nextPageToken)return files;
      if(response.nextPageToken===token)throw Error('Pagination Drive incohérente');
      token=response.nextPageToken;
    }
    throw Error('Historique Drive trop long : liste partielle refusée');
  }
  async function download(id) {
    if(!/^[A-Za-z0-9_-]{8,200}$/.test(String(id)))throw Error('Identifiant Drive invalide');
    const body=await request(BASE+'/'+encodeURIComponent(id)+'?alt=media',{},true);
    if(new TextEncoder().encode(body).length>MAX_BYTES)throw Error('Archive trop volumineuse');
    const parsed=JSON.parse(body);
    if(parsed?.format!=='MILFT-TOURNOIS-BACKUP'||parsed.version!==1||
       !Array.isArray(parsed.data?.tournaments)||!Array.isArray(parsed.data?.players))
      throw Error('Archive MILFT non reconnue');
    return {text:body, data:parsed};
  }
  return {upload,list,download,backupFolder};
}
root.MILFTDriveV11Core={createDriveClient,MAX_DAILY_UPLOADS,MIN_AUTO_MS,DEFAULT_AUTO_MINUTES,AUTO_INTERVAL_CHOICES};
if(typeof module!=='undefined'&&module.exports) module.exports=root.MILFTDriveV11Core;
const liveValidation = root.location?.origin==='https://milft37.github.io' &&
  root.location.pathname.startsWith('/milft-tournois/');
const localIsolatedTest = root.location?.hostname==='127.0.0.1' && root.__MILFT_DRIVE_BROWSER_TEST__===true;
// Mode fictif reconnu par l'URL : un cache ou un indicateur JS ancien ne doit
// jamais orienter un essai Android vers les dossiers des sauvegardes du club.
const fixtureMode = /(?:^|\/)drive-integration-fictive\.html$/.test(root.location?.pathname||'');
// Cet unique fichier de test a été créé dans le dossier normal du club
// le 18/11 lors de l'incident d'isolation Android. Ne jamais proposer sa restauration.
// Aucune suppression ou modification du fichier distant.
const MISROUTED_FIXTURE_NAME='MILFT_TOURNOIS_manuel_2026-11-18T21-22-47-261Z_10c31de2-81b.json';
function isTestArchive(name) {
  return name===MISROUTED_FIXTURE_NAME || /^MILFT_TOURNOIS_test-fictif_/.test(String(name||''));
}
if(!root.document || !(liveValidation||localIsolatedTest))return;
root.MILFTDriveV11Enabled=true;

let client=null, connected=false, auto=false, pending=false, busy=false, blocked=false, revision=0, lastUpload=0;
let accessToken='', expiration=0, interval=null, oauthPending=false, oauthTimer=null, oauthAttempt=0, oauthStartedAt=0, oauthPageHidden=false;
const $=id=>root.document.getElementById(id);
function readAutoInterval() {
  try {
    const val=Number(root.localStorage.getItem(AUTO_INTERVAL_KEY));
    return AUTO_INTERVAL_CHOICES.includes(val)?val:DEFAULT_AUTO_MINUTES;
  }catch{return DEFAULT_AUTO_MINUTES;}
}
let autoIntervalMinutes=readAutoInterval();
function autoIntervalMs(){return autoIntervalMinutes*60*1000;}
function isAutoKind(kind){return kind!=='manuel'&&kind!=='test-fictif';}
function localDay() {
  const date=new Date();
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function status(message,confirmed=false) {
  root.MILFTDriveStatus=message;
  // Visible even when the technical section stays folded on Android.
  const summary=$('milft-settings')?.querySelector('.settings-backup > summary .settings-panel-label small');
  if(summary){
    const short=confirmed?'Sauvegarde Drive confirmée':connected?'Google connecté à MILFT':oauthPending?'Connexion Google en cours':'Drive non connecté';
    summary.textContent='Données complètes — '+short;
  }
  const p=$('milft-google-auth-status');if(p)p.textContent=message;
  const ind=$('milft-drive-indicator');if(ind) {
    ind.textContent='☁️ '+message;
    ind.style.background=confirmed?'#e6f6eb':'#fff4dd';
    ind.style.color=confirmed?'#18582c':'#684500';
  }
}
function snapshot() {
  return {format:'MILFT-TOURNOIS-BACKUP',version:1,exportedAt:new Date().toISOString(),
    data:JSON.parse(JSON.stringify(db)),planning:JSON.parse(JSON.stringify(plan)),
    progressPreferences:JSON.parse(JSON.stringify(progressPrefs))};
}
function backupSummary(data) {
  const players=data?.data?.players?.length||0;
  const records=data?.data?.tournaments?.length||0;
  return 'Données de CE navigateur : '+players+' joueur(s) et '+records+
    ' enregistrement(s) de tournoi (poules/tableaux A-B compris).'+
    (!players&&!records?'\nATTENTION : aucune donnée de tournoi ni aucun joueur dans ce navigateur. Vérifie que tu utilises le bon appareil avant de continuer.':'')+
    '\nChaque sauvegarde est un nouvel instantané, sans remplacer les archives existantes.';
}
function tokenProvider() {
  if(!accessToken||Date.now()>expiration-60000) {
    connected=false;auto=false;stopInterval();refreshButtons();
    status('Google déconnecté ou autorisation expirée — sauvegarde automatique arrêtée, données locales conservées');
    return null;
  }
  return accessToken;
}
function dailyAllowance() {
  const day=localDay();
  let raw={};try{raw=JSON.parse(root.localStorage.getItem(AUTO_QUOTA_KEY)||'{}')||{};}catch{}
  const count=raw.day===day?Math.max(0,Math.floor(Number(raw.count)||0)):0;
  return {day,count};
}
function countUpload(kind) {
  if(!isAutoKind(kind))return true;
  const q=dailyAllowance();
  try{root.localStorage.setItem(AUTO_QUOTA_KEY,JSON.stringify({day:q.day,count:q.count+1}));return true;}
  catch {auto=false;stopInterval();return false;}
}
function changed() {
  pending=true;revision++;
  if(connected)status('Modifications locales en attente de sauvegarde Drive');
}
async function upload(kind,force=false,prepared=null) {
  if(busy||!client||!connected||blocked||!root.navigator.onLine)return false;
  if(!force && (!auto||!pending||Date.now()-lastUpload<autoIntervalMs()))return false;
  if(isAutoKind(kind)&&dailyAllowance().count>=MAX_DAILY_UPLOADS) {
    auto=false;stopInterval();refreshButtons();
    status('Plafond de '+MAX_DAILY_UPLOADS+' sauvegardes automatiques/jour atteint : automatique arrêtée, sauvegarde manuelle disponible et données locales conservées');
    return false;
  }
  const current=revision;
  busy=true;refreshButtons();
  status('Envoi Drive en cours — aucune sauvegarde confirmée');
  try {
    const result=await client.upload(prepared||snapshot(),kind);
    const quotaSaved=countUpload(kind);
    lastUpload=Date.now();
    if(current===revision)pending=false;
    const quotaReached=isAutoKind(kind)&&dailyAllowance().count>=MAX_DAILY_UPLOADS;
    if(quotaReached){auto=false;stopInterval();}
    const suffix=!quotaSaved?' — automatique arrêtée : suivi du quota indisponible':
      quotaReached?' — plafond automatique journalier atteint, sauvegarde manuelle disponible':'';
    status('Sauvegarde Drive confirmée ('+result.name+') — '+new Date(lastUpload).toLocaleString('fr-FR')+suffix,!pending);
    return true;
  }catch(e) {
    const msg=String(e.message||e);
    if(/quota|rate limit|HTTP 403|HTTP 429/i.test(msg)){blocked=true;auto=false;stopInterval();}
    status('Drive non sauvegardé : '+msg+' ; JSON local conservé');
    return false;
  }finally{busy=false;refreshButtons();}
}
function stopInterval(){if(interval){root.clearInterval(interval);interval=null;}}
function startInterval(){stopInterval();interval=root.setInterval(()=>upload('automatique'),autoIntervalMs());}
function refreshButtons() {
  const manual=$('milft-drive-save-now'),automatic=$('milft-drive-auto'),history=$('milft-drive-list-v11');
  if(manual)manual.disabled=!connected||busy;
  if(automatic){automatic.disabled=!connected||fixtureMode||busy;automatic.textContent=auto?'Désactiver la sauvegarde automatique':'Activer la sauvegarde automatique';}
  if(history)history.disabled=!connected;
}
function finishOAuthAttempt() {
  oauthPending=false;
  oauthStartedAt=0;
  oauthPageHidden=false;
  if(oauthTimer){root.clearTimeout(oauthTimer);oauthTimer=null;}
}
function oauthReturnNotConfirmed() {
  if(!oauthPending||connected)return;
  finishOAuthAttempt();
  status('RETOUR GOOGLE ABSENT : Google peut avoir enregistré les droits, mais MILFT n’a reçu aucun jeton. Drive reste déconnecté. Ne relance pas les autorisations en boucle.');
  refreshButtons();
}
function popupError(err) {
  finishOAuthAttempt();
  const type=String(err?.type||'unknown');
  if(type==='popup_closed')status('La fenêtre Google s’est fermée sans confirmer la connexion à MILFT. Aucune sauvegarde Drive active.');
  else if(type==='popup_failed_to_open')status('La fenêtre Google a été bloquée par le navigateur. Ouvre MILFT directement dans Chrome puis réessaie.');
  else status('Retour Google impossible ('+type.slice(0,48)+'). MILFT reste en mode local.');
  refreshButtons();
}
async function connect() {
  if(oauthPending){status('Connexion Google toujours en attente. Ne relance pas plusieurs autorisations ; ferme la fenêtre Google puis reviens à MILFT.');return;}
  if(!root.google?.accounts?.oauth2){
    status('Service de connexion Google indisponible : vérifie la connexion Internet et ouvre la page directement dans Chrome.');
    return;
  }
  const attempt=++oauthAttempt;
  try{
    const oauth=root.google.accounts.oauth2.initTokenClient({
      client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,
      callback:(response)=>{
        if(attempt!==oauthAttempt)return;
        finishOAuthAttempt();
        if(response?.error){
          status('Google a refusé la connexion : '+String(response.error).slice(0,70)+'. Aucune sauvegarde envoyée.');
          refreshButtons();return;
        }
        if(!response?.access_token){
          status('Google n’a pas transmis de jeton d’accès à MILFT. Aucune sauvegarde Drive active.');
          refreshButtons();return;
        }
        if(response.scope&&!response.scope.split(' ').includes(SCOPE)){
          status('Accès Google Drive insuffisant : autorisation Drive non reçue.');
          refreshButtons();return;
        }
        accessToken=response.access_token;
        expiration=Date.now()+(Number(response.expires_in)||3600)*1000;
        client=createDriveClient(root.fetch.bind(root),tokenProvider,fixtureMode?{testMode:true}:{});
        connected=true;blocked=false;auto=false;pending=true;revision++;
        refreshButtons();
        status('Google connecté à MILFT (autorisation reçue). Aucun fichier n’a encore été envoyé.');
      },
      error_callback:(err)=>{if(attempt!==oauthAttempt)return;popupError(err);}
    });
    oauthPending=true;oauthStartedAt=Date.now();oauthPageHidden=false;
    status('Connexion Google en cours : termine l’autorisation puis reviens sur cet écran MILFT. Aucun fichier ne sera envoyé automatiquement.');
    // Sur Android, le consentement peut avoir lieu dans un autre onglet.
    // Si aucun callback n'arrive, ne jamais déclarer la connexion réussie.
    oauthTimer=root.setTimeout(oauthReturnNotConfirmed,30000);
    // L'accès déjà accordé ne nécessite pas de refaire systématiquement le consentement.
    oauth.requestAccessToken({prompt:''});
  }catch(error){
    if(attempt!==oauthAttempt)return;
    finishOAuthAttempt();
    status('Ouverture Google impossible : '+String(error?.message||error).slice(0,160)+' ; Drive reste déconnecté.');
    refreshButtons();
  }
}
root.document.addEventListener('visibilitychange',()=>{
  if(root.document.visibilityState==='hidden'&&oauthPending)oauthPageHidden=true;
  if(root.document.visibilityState==='visible'&&oauthPending&&oauthPageHidden){
    root.setTimeout(()=>{if(oauthPending&&Date.now()-oauthStartedAt>=3500)oauthReturnNotConfirmed();},3500);
  }
});
root.addEventListener('focus',()=>{
  if(!oauthPending||connected||!oauthPageHidden)return;
  root.setTimeout(()=>{if(oauthPending&&Date.now()-oauthStartedAt>=3500)oauthReturnNotConfirmed();},3500);
});
async function manual() {
  if(busy){status('Un envoi Drive est déjà en cours.');return;}
  const prepared=snapshot();
  if(!root.confirm('SAUVEGARDE DRIVE MANUELLE\n\n'+backupSummary(prepared)+
    '\n\nEnvoyer maintenant ces données vers le Drive du compte connecté ?'))return;
  await upload(fixtureMode?'test-fictif':'manuel',true,prepared);
}
async function toggleAuto() {
  if(fixtureMode){status('Mode essai : sauvegarde automatique désactivée pour les données fictives.');return;}
  if(auto){auto=false;stopInterval();status('Sauvegardes automatiques désactivées — archives précédentes conservées');refreshButtons();return;}
  if(busy){status('Un envoi Drive est déjà en cours.');return;}
  if(dailyAllowance().count>=MAX_DAILY_UPLOADS){
    status('Plafond de '+MAX_DAILY_UPLOADS+' sauvegardes automatiques déjà atteint aujourd’hui. La sauvegarde manuelle reste disponible.');return;
  }
  const prepared=snapshot();
  if(!root.confirm('SAUVEGARDE DRIVE AUTOMATIQUE\n\n'+backupSummary(prepared)+
    '\n\nCréer une première archive maintenant, puis sauvegarder les modifications toutes les '+autoIntervalMinutes+' minutes pendant que MILFT est ouvert et connecté ? Limite de '+MAX_DAILY_UPLOADS+' sauvegardes automatiques par jour et par appareil. Pas de sauvegarde garantie application fermée.'))return;
  // Aucun mode automatique tant que le premier dépôt n'a pas été confirmé.
  const ok=await upload('activation',true,prepared);
  if(!ok){auto=false;stopInterval();refreshButtons();status('Sauvegarde automatique NON activée : premier envoi non confirmé. Les données locales et archives précédentes sont conservées.');return;}
  if(dailyAllowance().count>=MAX_DAILY_UPLOADS){
    auto=false;stopInterval();refreshButtons();
    status('Sauvegarde Drive confirmée, mais limite de '+MAX_DAILY_UPLOADS+' archives automatiques atteinte : automatique non activée.');return;
  }
  auto=true;startInterval();refreshButtons();
  status(root.MILFTDriveStatus+' — automatique activée toutes les '+autoIntervalMinutes+' minutes (application ouverte uniquement)',true);
}
async function history() {
  const target=$('milft-drive-archives');if(!target)return;
  target.hidden=false;
  target.replaceChildren();target.textContent='Chargement des archives Drive…';
  status('Consultation des archives Drive en cours…');
  target.scrollIntoView?.({block:'nearest'});
  try {
    if(!connected||!client)throw Error('Google Drive non connecté : reconnecter le compte du club');
    const archives=await client.list();target.replaceChildren();
    if(!archives.length){
      target.textContent='Aucune archive dans '+(fixtureMode?'MILFT Tournois - Essais / Sauvegardes fictives':'MILFT Tournois / Sauvegardes')+' pour ce compte.';
      status('Archives Drive consultées : aucune archive dans ce dossier.');
      target.scrollIntoView?.({block:'nearest'});
      return;
    }
    for(const file of archives) {
      const line=root.document.createElement('div');line.className='item';
      const label=root.document.createElement('p');
      const testArchive=isTestArchive(file.name);
      label.textContent=(testArchive?'ARCHIVE D’ESSAI — NE PAS RESTAURER — ':'')+file.name+' — '+(file.createdTime?new Date(file.createdTime).toLocaleString('fr-FR'):'date inconnue');
      line.append(label);
      const download=root.document.createElement('button');download.type='button';download.textContent='Télécharger JSON';
      download.onclick=async()=>{try {
        const backup=await client.download(file.id);
        const url=root.URL.createObjectURL(new Blob([backup.text],{type:'application/json'}));
        const a=root.document.createElement('a');a.href=url;a.download=file.name;a.click();
        root.setTimeout(()=>root.URL.revokeObjectURL(url),60000);
        status('Archive téléchargée — aucune donnée de l’application modifiée');
      }catch(e){status('Téléchargement impossible : '+e.message);}};
      if(fixtureMode){line.append(download);target.append(line);continue;}
      const restore=root.document.createElement('button');restore.type='button';restore.className='mutedbtn';
      restore.textContent=testArchive?'Archive d’essai : restauration désactivée':'Restaurer (avec confirmations)';
      restore.disabled=testArchive;
      restore.onclick=async()=>{
        if(testArchive){status('Restauration refusée : archive d’essai connue, données locales intactes');return;}
        if(!root.confirm('Restaurer cette archive ? La procédure existante vérifiera les données et demandera ses confirmations de sécurité.'))return;
        try {
          const backup=await client.download(file.id);
          const input={files:[new File([backup.text],file.name,{type:'application/json'})],value:''};
          await root.milftImportBackup(input);
        }catch(e){status('Restauration interrompue : '+e.message);}
      };
      line.append(download,restore);target.append(line);
    }
    status('Archives Drive : '+archives.length+' archive'+(archives.length>1?'s':'')+' disponible'+(archives.length>1?'s':'')+' ci-dessous.');
    target.scrollIntoView?.({block:'nearest'});
  }catch(e){
    const message=String(e?.message||e);
    target.textContent='Historique Drive indisponible : '+message;
    status('Archives Drive indisponibles : '+message);
    target.scrollIntoView?.({block:'nearest'});
  }
}
function disconnect() {
  oauthAttempt++;finishOAuthAttempt();
  const token=accessToken;accessToken='';expiration=0;connected=false;auto=false;client=null;stopInterval();
  if(token&&root.google?.accounts?.oauth2)root.google.accounts.oauth2.revoke(token,()=>{});
  refreshButtons();status('Drive déconnecté — données locales intactes');
}
function init() {
  const panel=$('milft-google-auth');if(!panel)return;
  panel.replaceChildren();
  const heading=root.document.createElement('strong');heading.textContent=fixtureMode?'☁️ Google Drive — essai isolé (joueurs fictifs)':'☁️ Google Drive — MILFT Tournois V1.1 (sauvegardes du club)';
  const p=root.document.createElement('p');p.id='milft-google-auth-status';p.setAttribute('role','status');
  panel.append(heading,p);
  if(!fixtureMode) {
    const intervalRow=root.document.createElement('div');
    intervalRow.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0';
    const label=root.document.createElement('label');
    label.htmlFor='milft-drive-auto-interval';
    label.textContent='Sauvegarde automatique toutes les';
    const select=root.document.createElement('select');
    select.id='milft-drive-auto-interval';
    select.style.cssText='min-height:42px;max-width:100%;padding:8px;border-radius:8px';
    for(const minutes of AUTO_INTERVAL_CHOICES) {
      const option=root.document.createElement('option');
      option.value=String(minutes);option.textContent=minutes+' min';
      select.append(option);
    }
    select.value=String(autoIntervalMinutes);
    select.onchange=()=>{
      const minutes=Number(select.value);
      if(!AUTO_INTERVAL_CHOICES.includes(minutes))return;
      autoIntervalMinutes=minutes;
      try{root.localStorage.setItem(AUTO_INTERVAL_KEY,String(minutes));}
      catch{status('Préférence non conservée sur cet appareil ; réglage temporaire : '+minutes+' minutes');}
      if(auto)startInterval();
      status('Fréquence réglée sur '+minutes+' minutes'+(auto?' (automatique actif)':' (automatique désactivé)')+
        '. Plafond : '+MAX_DAILY_UPLOADS+' sauvegardes automatiques/jour/appareil ; saisie locale inchangée.');
    };
    intervalRow.append(label,select);
    panel.append(intervalRow);
  }
  const row=root.document.createElement('div');row.className='milft-drive-actions';
  const actions=[
    ['milft-google-connect','Se connecter au Drive du club',connect],
    ['milft-drive-save-now','Sauvegarder maintenant',manual],
    ['milft-drive-auto','Activer la sauvegarde automatique',toggleAuto],
    ['milft-drive-list-v11','Voir les archives Drive',history],
    ['milft-google-disconnect','Déconnecter',disconnect]
  ];
  for(const [id,label,click] of actions){
    const b=root.document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.onclick=click;row.append(b);
  }
  // Placer les archives sous leur bouton plutôt qu'après tous les contrôles.
  const list=root.document.createElement('div');list.id='milft-drive-archives';
  list.hidden=true;list.style.gridColumn='1 / -1';list.style.minWidth='0';list.style.overflowWrap='anywhere';
  list.setAttribute('role','region');list.setAttribute('aria-label','Résultat des archives Google Drive');
  list.setAttribute('aria-live','polite');
  row.querySelector('#milft-drive-list-v11').after(list);
  panel.append(row);
  const info=root.document.createElement('p');
  info.style.fontSize='12px';
  info.textContent=fixtureMode?'Mode de validation isolé : seules des données fictives sont présentes ici. Les sauvegardes vont dans « MILFT Tournois - Essais / Sauvegardes fictives ». Pas de restauration ni de sauvegarde automatique dans ce mode. Aucun tournoi du club n’est lu.':'Dossier visible : MILFT Tournois / Sauvegardes. Les archives sont nouvelles et jamais écrasées. Le Drive ne synchronise PAS les tournois entre appareils en temps réel. Connexion et activation volontaires uniquement. Fonctionne pendant que l’application est ouverte.';
  panel.append(info);
  const backupStatus=root.document.createElement('p');backupStatus.id='milft-drive-archives-status';panel.append(backupStatus);
  if(typeof root.save==='function') {
    const prior=root.save;root.save=function(...args){const result=prior.apply(this,args);changed();return result;};
  }
  if(typeof root.planSave==='function') {
    const prior=root.planSave;root.planSave=function(...args){const result=prior.apply(this,args);changed();return result;};
  }
  root.addEventListener('online',()=>{if(auto&&pending)upload('reconnexion');});
  root.document.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='visible'&&auto&&pending)upload('reprise');});
  refreshButtons();
  status('MODE LOCAL — aucune sauvegarde Drive activée, données du navigateur préservées');
}
root.MILFTDriveV11Test={upload,changed,dailyAllowance,fixtureMode,autoIntervalMs};
if(localIsolatedTest)root.MILFTDriveV11Test.simulateOAuthTimeout=oauthReturnNotConfirmed;
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);
