const CACHE_NAME = 'dc-payroll-v30';
const PAYROLL_SCOPE = '/dental_city_payroll/';

const STATIC_ASSETS = [
  PAYROLL_SCOPE,
  PAYROLL_SCOPE + 'index.html'
];

// Install event: cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Cache addAll partial failure (OK for dynamic routes):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name.startsWith('dc-payroll'))
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: network-first, fallback to cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle /dental_city_payroll/ scope
  if (!url.pathname.startsWith(PAYROLL_SCOPE)) {
    return;
  }

  // Skip non-GET or cross-origin
  if (e.request.method !== 'GET') {
    return;
  }

  // Supabase API calls: network only
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML: network-first
  if (e.request.destination === 'document' || e.request.url.endsWith('/') || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || new Response('Offline')))
    );
    return;
  }

  // Assets (JS, CSS, images): cache-first
  if (['script', 'style', 'image', 'font'].includes(e.request.destination)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(response => {
          if (response.ok && e.request.destination !== 'font') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
          }
          return response;
        }).catch(() => {
          if (e.request.destination === 'image') return new Response('Image unavailable', { status: 410 });
          throw new Error('Network failed');
        });
      })
    );
    return;
  }

  // Default: network-first
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Message handler for cache bust
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
