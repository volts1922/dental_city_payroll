// DC PAYROLL SERVICE WORKER v30.53
const VERSION = 'v30.53-bulk-sync';
const CACHE = 'dental-city-payroll-' + VERSION;

self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => !k.includes('v30.53')).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request)
      .then(r => {
        caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

console.log('[SW] Service Worker loaded v30.53');
