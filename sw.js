// Lafz service worker: offline-first app shell.
const V = 'lafz-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/views.css',
  './js/main.js',
  './js/util.js',
  './js/engine.js',
  './js/db.js',
  './js/ui.js',
  './js/seed.js',
  './js/seed-idioms.js',
  './js/seed-words.js',
  './js/seed-shayari.js',
  './js/views/idioms.js',
  './js/views/practice.js',
  './js/views/shayari.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => hit)
    )
  );
});
