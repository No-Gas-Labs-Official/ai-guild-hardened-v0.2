// No_Gas_Labs™ Matrix - Service Worker (cache-first, update-in-background)
const CACHE_NAME = 'ngl-matrix-v2026-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/matrix-preview.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      if (resp && resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
      return resp;
    }).catch(() => caches.match('/index.html')))
  );
});