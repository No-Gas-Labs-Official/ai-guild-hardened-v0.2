// Simple cache-first service worker for basic offline support.
// Update CACHE_NAME to bust when you deploy changes.
const CACHE_NAME = 'no-gas-matrix-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/matrix-preview.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request).then(networkRes => {
      return networkRes;
    }).catch(()=> caches.match('/index.html')))
  );
});