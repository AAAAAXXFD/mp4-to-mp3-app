const CACHE_NAME = 'mp3-converter-v2';
const BASE_URL = '/mp4-to-mp3-app';

const urlsToCache = [
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/assets/css/main.css`,
  `${BASE_URL}/assets/css/rtl.css`,
  `${BASE_URL}/assets/css/animations.css`,
  `${BASE_URL}/assets/js/app.js`,
  `${BASE_URL}/assets/icons/icon-192.svg`,
  `${BASE_URL}/assets/icons/icon-512.svg`
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
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // CDN را کش نکن
  if (url.hostname.includes('unpkg.com') || 
      url.hostname.includes('jsdelivr.net')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});