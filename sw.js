const CACHE_VERSION = 'dc-payroll-v30.39'; // BUMPED from v30.9 - Force refresh on ALL devices

self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Cache opened:', CACHE_VERSION);
      return cache.addAll([
        '/dental_city_payroll/',
        '/dental_city_payroll/index.html',
        '/dental_city_payroll/manifest.json'
      ]).catch(err => {
        console.warn('[SW] Cache addAll partial failure (expected):', err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls (always fetch fresh)
  if (request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // For HTML, CSS, JS: Try network first, fallback to cache
  if (request.url.includes('.html') || request.url.includes('.js') || request.url.includes('.css')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            // Clone FIRST before anything consumes the response
            const responseToCache = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For everything else: Cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded. Cache version:', CACHE_VERSION);
