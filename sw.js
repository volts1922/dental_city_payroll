// DC PAYROLL SERVICE WORKER v30.54
// Period-specific deductions, fixed payslip generation

const VERSION = 'v30.54-payslip-periods';
const CACHE = 'dc-payroll-' + VERSION;

self.addEventListener('install', e => {
  console.log('[SW] Installing v30.54...');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating v30.54...');
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(// DC PAYROLL SERVICE WORKER v30.55
// Fixed: totalAllow missing in payslip generation

const VERSION = 'v30.55-payslip-fix';
const CACHE = 'dc-payroll-' + VERSION;

self.addEventListener('install', e => {
  console.log('[SW] Installing v30.55...');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating v30.55...');
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => !k.includes('v30.55'))
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          return cached || new Response('Offline - no cached version', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({'Content-Type': 'text/plain'})
          });
        });
      })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v30.55 ready');
        keys
          .filter(k => !k.includes('v30.54'))
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          return cached || new Response('Offline - no cached version', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({'Content-Type': 'text/plain'})
          });
        });
      })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v30.54 ready');
