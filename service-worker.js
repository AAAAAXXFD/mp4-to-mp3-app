const CACHE_NAME = 'mp3-converter-v3';
const BASE_URL = '/mp4-to-mp3-app';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/css/rtl.css',
  './assets/css/animations.css',
  './assets/js/app.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Cache error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip CDN resources
  if (event.request.url.includes('unpkg.com') || 
      event.request.url.includes('jsdelivr')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});