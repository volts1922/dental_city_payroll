const CACHE_NAME = 'dc-payroll-v30.5';
const SCOPE = '/dental_city_payroll/';

// Assets to cache on install
const STATIC_ASSETS = [
  SCOPE,
  SCOPE + 'index.html'
];

// Install event - cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Fail gracefully if assets can't be cached (common in dev)
        console.warn('⚠️ Could not cache all static assets');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Only handle requests within our scope
  if (!url.pathname.startsWith(SCOPE)) {
    return;
  }
  
  // Network first for API calls (Supabase)
  if (url.pathname.includes('/supabase/') || url.host.includes('supabase')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Cache successful Supabase responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(e.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if offline
          return caches.match(e.request).then((cached) => {
            return cached || new Response('Offline - no cached data', { status: 503 });
          });
        })
    );
    return;
  }
  
  // Cache first for HTML and static assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(e.request).then((response) => {
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, response.clone());
          });
        }
        return response;
      });
    })
  );
});
