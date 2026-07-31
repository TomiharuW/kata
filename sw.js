// Cache-first service worker. No build step: this list is maintained by hand —
// whenever a new file is added under src/, public/, or reference/*.css, add its path here.
// Bump on every deploy: the old cache is deleted on activate, so a changed
// version is what actually pushes updated files onto installed devices.
const CACHE_VERSION = 'kata-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './reference/design-system.css',
  './src/app.css',
  './src/app.js',
  './src/lib/dom.js',
  './src/state/store.js',
  './src/data/index.js',
  './src/screens/today.js',
  './src/screens/log.js',
  './src/screens/routine.js',
  './src/screens/goals.js',
  './src/screens/study.js',
  './src/screens/library.js',
  './src/screens/setup.js',
  './public/icons/icon-192.png',
  './public/icons/icon-512.png',
  './public/icons/maskable-192.png',
  './public/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Network-first for the study sheet CSV / API calls (always want fresh data when online).
  if (url.hostname === 'docs.google.com' || url.hostname.endsWith('script.google.com')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for everything else (app shell + Google Fonts CSS/woff2).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (isSameOrigin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline and not cached: ' + req.url);
      });
    })
  );
});
