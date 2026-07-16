// DC PAYROLL SERVICE WORKER v69
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
// v56: calendar now shows color-coded employee names per day — green Present,
// amber Late (past 10:00 + 15min grace), blue On Leave (approved), red Absent
// (past days only). Month view shows up to 3 names per day with a +N overflow.
// v57: payslip fix — generating a payslip for a period with zero attendance
// (e.g. a future cutoff like the 16th–31st) now shows a warning instead of
// fabricating a full-pay payslip; days worked always come from real records.
// v58: Owner nav slimmed to review/approve — removed per-branch encoding pages
// (Employees, Attendance, Leave, Loans, Payroll); those live on superadmin and
// dev accounts. Nav groups now render from group tags instead of fragile slice
// offsets. Owner now lands on All Employees after login.
// v59: Shift Manager made real — shift times now sync to the cloud per branch
// (new pr_shifts data type) instead of one device's localStorage; each
// employee's assigned shift now drives the late deduction (payroll, payslip,
// calendar) instead of a hardcoded 10:00 for everyone; fixed 'Save Employee
// Shifts' corrupting the employees blob by saving it as an array.
// v60: (1) Loan deductions unified to a 50/50 split across both monthly
// cutoffs — payroll screen, payslip, summaries and the balance reduction all
// use one rule now (screen previously deducted the full monthly amount every
// cutoff = double deduction; payslip deducted 1st half only). (2) Stored-XSS
// hardening: form inputs strip HTML characters, all cloud blobs are deep-
// sanitized on load, calendar name chips escaped.
// v61: deductions unified to ONE rulebook. Payslips previously used ad-hoc
// rates (SSS 4% of gross, PhilHealth 2.5%, Pag-IBIG flat 100, and the 8%
// self-employed percentage tax formula for employees). Now every screen uses
// the official tables (computeSSS 2025 5% MSC, computePH, computePagibig,
// computeTax TRAIN). Convention: contributions on the 1st cutoff, monthly
// withholding tax on the 2nd cutoff, loans 50/50 per cutoff (full monthly on
// monthly register). Individual payslip now includes loan deductions (was 0).
// v62: readability fix — TOTAL rows in Payroll Summary (all-branches and
// per-branch) showed dark text on the navy panel because the global tbody td
// color rule overrode the row's white text. Total rows now use a .total-row
// class that keeps cell text white.
// v63: Shift Manager — owner now sees an all-branches overview at the top
// (each employee with their branch, colour-coded, and assigned shift as a
// badge). The editable assign-shifts list also shows a branch chip per
// employee. Read-only overview; editing still applies to the selected branch.
// v64: security + BIR release — quote-safe _esc() escaping at 100+ render
// sites and in formRow (stored-XSS closed); username rename disabled until it
// syncs to Supabase Auth; attendance edits now send only DB-allowed statuses
// (silent sync-reject fixed); custom payroll range shows a double-deduction
// warning; BIR 1604-C Alphalist .DAT export (owner/dev/superadmin only) with
// RDO code field; attendance edit/delete restricted to owner/dev/superadmin
// (UI + RLS); owner login lands on All Branches — branch prompt removed.
// v65: hardcoded dev credential removed from public source — dev now logs
// in via Supabase Auth like all accounts; offline login uses a per-device
// cache written after each successful cloud login (pr_offline_login).
// v66: 9-branch scale fixes — owner-load timeout 5s→15s; attendance archive
// (owner/superadmin "Archive Old" button moves records >14 months to a
// pr_attendance_archive cloud row, kept not deleted); archive rows excluded
// from owner bulk load and per-branch load so payloads stay small.
// v67: Owner/Dev login no longer shows the "Set Branch Name" modal — empty
// branch now means All Branches (sidebar shows "All Branches", title kept).
const CACHE_VERSION = 'dental-city-payroll-v69-nocache';
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
          if (cacheName !== CACHE_NAME) { // v56: was hardcoded 'v53' — kept stale caches, deleted fresh ones
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

console.log('[SW] Service Worker loaded v67');
