// DC PAYROLL SERVICE WORKER v53
// v45: migrated login to Supabase Auth (real sessions + RLS) instead of a
// client-trusted role check.
// v46: removed hardcoded demo owner/branch1-9 credentials from the offline
// fallback list — only the dev emergency account remains.
// v47: account create/edit/delete/self password-change now sync the real
// Supabase Auth credential via the admin-account edge function, not just
// the legacy payroll_accounts.password_hash column.
// v48: deleteAccount now warns if the real login credential fails to delete
// (instead of silently swallowing the error), matching a hardened edge
// function that no longer masks that failure.
// v49: fixed stale service-worker registration tag in index.html (_SW_VER
// was stuck at v43 since v44 while sw.js itself kept bumping) — was causing
// some returning browsers to keep running an old cached service worker.
// v50: fixed OT/overtime pay computing as ₱0 everywhere (Payroll screen,
// individual Payslip, clock-out) — code assumed Supabase timestamps were
// space-separated ("... 10:00:00") but they're actually ISO 'T'-separated
// ("...T10:00:00"), so the old .split(' ') logic silently grabbed nothing.
// v51: added tardiness (late) deduction — 10:00 AM shift start + 15min
// grace period, proportional per-minute deduction beyond that, shown as its
// own payslip line. Also corrected the old stale 8:10 AM "Late" status
// cutoff to match the real 10 AM shift start.
// v52: added a dedicated "Late Ded." column to the bulk Payroll screen
// table (previously only visible on the individual Payslip) and included
// Late Deduction / Late Minutes in the CSV export.
// v53: fixed Owner sidebar section headers (Overview / Branch Ops /
// Management) — the group slice offsets were stale after "All Branches"
// and "Dashboard" nav items were removed, so Employees/Attendance showed
// under Overview and Holidays/Shift Manager showed under Branch Ops.
// Now grouped correctly; no functional change, all tabs still worked.

// v54: security + sync hardening — stopped syncing account password hashes
// into payroll_data (pr_accounts blobs); added stale-write guard so two users
// online can't silently overwrite each other's saves; fixed _sbInsertOrUpdate
// conflict keys (payroll_data, pr_payroll_approvals); fixed payroll-confirm
// approvals payload to match the real table schema; removed redundant double
// blob writes; employee purge now handles object-stored blobs.
// v55: Attendance calendar — replaced the date input with Week / Month / Year
// calendar views; days with attendance records show a green dot; click a day
// to load its records. View choice remembered per device.
const CACHE_VERSION = 'dental-city-payroll-v55-nocache';
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
          if (!cacheName.includes('v53')) {
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
    fetch(event.request, { cache: 'no-store' })
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

console.log('[SW] Service Worker loaded v53');
