/* MILFT Tournois V1.1 — cache applicatif de validation uniquement. */
const CACHE = 'milft-validation-shell-v1-20261119-drive-moved-folders-01';
const SHELL = [
  './MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html',
  './manifest.webmanifest',
  './milft-drive-v11-validation.js?v=20261119-drive-moved-folders-01',
  './MILFT_Tournois_192.png',
  './MILFT_Tournois_512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('milft-validation-shell-') && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html')));
    return;
  }
  if (!SHELL.some(path => new URL(path, self.registration.scope).href === req.url)) return;
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
