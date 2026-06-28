// DC Payroll Service Worker v30.76
const VERSION = 'v30.76-fix-ghost-tracker-null';
const CACHE = 'dcpayroll-v30.76';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.includes('v30.76')).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request) || new Response('Offline', {status: 503}))
  );
});

console.log('[SW] v30.76 ready');
