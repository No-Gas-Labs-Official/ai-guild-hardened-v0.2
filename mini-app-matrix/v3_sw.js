// Service worker: cache-first with network update (stale-while-revalidate)
// Version this file when you release a new site to bust caches (update CACHE_NAME).
const CACHE_NAME = 'nogas-matrix-v2026-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/matrix-preview.png',
  '/.well-known/farcaster.json'
];

// Install — precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch handler — serve cache first, then update cache in background
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Navigation requests (HTML) -> try network first fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // Put copy in cache for offline use
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests: try cache, then network, update cache when network succeeds
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((resp) => {
          // Only cache successful responses
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => null);

      // Return cached if present immediately, otherwise wait for network
      return cached || networkFetch;
    })
  );
});