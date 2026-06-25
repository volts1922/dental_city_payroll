const CACHE_NAME = 'dc-payroll-v30.6';
const SCOPE = '/dental_city_payroll/';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll([SCOPE, SCOPE + 'index.html']).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => {
        if (name !== CACHE_NAME) return caches.delete(name);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Only handle our scope
  if (!url.pathname.startsWith(SCOPE)) return;
  
  // Supabase = network first
  if (url.host.includes('supabase')) {
    return e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          try {
            caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
          } catch (err) {}
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
  
  // Everything else = cache first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        if (!res || res.status !== 200) return res;
        try {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, cloned));
        } catch (err) {}
        return res;
      });
    })
  );
});
