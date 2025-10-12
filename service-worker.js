const CACHE_NAME = 'offline-app-v1';
const urlsToCache = [
  '/',
  '/mp4-to-mp3-app/',
  '/mp4-to-mp3-app/index.html',
  '/mp4-to-mp3-app/assets/js/app.js',
  '/mp4-to-mp3-app/assets/vendor/@ffmpeg/ffmpeg/ffmpeg.js',
  '/mp4-to-mp3-app/assets/vendor/@ffmpeg/core/ffmpeg-core.js',
  '/mp4-to-mp3-app/assets/vendor/@ffmpeg/core/ffmpeg-core.wasm',
  '/mp4-to-mp3-app/assets/css/main.css',
  '/mp4-to-mp3-app/assets/css/rtl.css',
  '/mp4-to-mp3-app/assets/css/animations.css',
  '/mp4-to-mp3-app/manifest.json',
  '/mp4-to-mp3-app/assets/icons/icon-192.svg',
  '/mp4-to-mp3-app/assets/icons/icon-512.svg'
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
