const CACHE_NAME = 'offline-app-v1';
const urlsToCache = [
  '/',
  '',
  'index.html',
  'assets/js/app.js',
  'assets/vendor/@ffmpeg/ffmpeg/ffmpeg.js',
  'assets/vendor/@ffmpeg/core/ffmpeg-core.js',
  'assets/vendor/@ffmpeg/core/ffmpeg-core.wasm',
  'assets/css/main.css',
  'assets/css/rtl.css',
  'assets/css/animations.css',
  'manifest.json',
  'assets/icons/icon-192.svg',
  'assets/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
