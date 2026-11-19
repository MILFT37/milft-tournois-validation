/* MILFT Tournois V1.1 — application shell only, never cache private JSON exports. */
const CACHE='milft-production-shell-v1-20261119-header-v11-01';
const APP='./MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html';
const SHELL=[APP,'./index.html','./manifest.production.webmanifest','./MILFT_Tournois_192.png','./MILFT_Tournois_512.png','./milft-drive-v11-production.js?v=20261119-prod-candidate-200-01'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('milft-production-shell-')&&key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    const url=new URL(request.url);
    const scope=new URL(self.registration.scope);
    const appUrl=new URL(APP,scope);
    if(url.pathname!==appUrl.pathname&&url.pathname!==scope.pathname&&url.pathname!==new URL('./index.html',scope).pathname)return;
    event.respondWith(fetch(request).catch(()=>caches.match(APP)));
    return;
  }
  if(!SHELL.some(path=>new URL(path,self.registration.scope).href===request.url))return;
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
