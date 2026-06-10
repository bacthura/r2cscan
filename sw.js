/**
 * R2C-Scan — Service Worker
 * v3 — HTML sempre network-first (garante deploys novos); assets cache-first
 */
const CACHE_NAME = 'r2cscan-v3';
const STATIC_CACHE = 'r2cscan-static-v3';
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
  const req = e.request;

  // Network-first para chamadas de API
  if (req.url.includes('/api/')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Network-first para navegações / HTML.
  // Garante que o index.html mais novo (com a tela de login) sempre chegue
  // quando online; cai para o cache só quando offline.
  if (
    req.mode === 'navigate' ||
    req.url === self.location.origin + '/' ||
    req.url.endsWith('.html')
  ) {
    e.respondWith(
      fetch(req)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put('/index.html', clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Cache-first (stale-while-revalidate) para assets estáticos
  if (
    req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/) ||
    req.url.includes('/manifest.json')
  ) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then(c => c.put(req, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Fallback: rede primeiro, cache depois
  e.respondWith(
    fetch(req).catch(() =>
      caches.match(req).then(cached => {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('/index.html');
        return new Response('Offline', { status: 503 });
      })
    )
  );
});
