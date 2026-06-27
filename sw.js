// DC PAYROLL SERVICE WORKER v30.52
// Fixed: Variable shadowing in _sbInsertOrUpdate, employee update sync

const CACHE_VERSION = 'dental-city-payroll-v30.52-var-shadow-fix';
const CACHE_NAME = CACHE_VERSION;

// Files to cache
const urlsToCache = [
  '/dental_city_payroll/',
  '/dental_city_payroll/index.html',
  '/dental_city_payroll/manifest.json'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache).catch(e => {
        console.warn('[SW] Cache addAll failed (expected for offline install):', e);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes('v30.52')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache if not ok
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone response BEFORE using it
        const responseToCache = response.clone();

        // Cache the response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch(e => {
            // Silently fail cache put
          });
        });

        return response;
      })
      .catch(() => {
        // Return cached version if offline
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - cached version not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({'Content-Type': 'text/plain'})
          });
        });
      })
  );
});

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded v30.52');
