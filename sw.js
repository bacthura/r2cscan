/**
 * R2C-Scan — Service Worker
 * v2.0 — Network-first with cache fallback, versioned caches
 */
const CACHE_NAME = 'r2cscan-v2';
const STATIC_CACHE = 'r2cscan-static-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log(`[SW] Activating ${CACHE_NAME}`);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== CACHE_NAME)
          .map(k => {
            console.log(`[SW] Removing old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first for API calls
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for static assets
  if (
    e.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/) ||
    e.request.url.includes('/manifest.json') ||
    e.request.url === self.location.origin + '/'
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first with HTML fallback for everything else
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
