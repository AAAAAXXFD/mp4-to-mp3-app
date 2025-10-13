const CACHE_NAME = 'mp3-converter-v5';
const STATIC_CACHE = 'static-v5';
const FFMPEG_CACHE = 'ffmpeg-v5';

const staticAssets = [
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

// استفاده از single-thread که SharedArrayBuffer نمی‌خواهد
const ffmpegAssets = [
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.wasm'
];

// نصب Service Worker: کش کردن استاتیک و ffmpeg assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(staticAssets)),
      caches.open(FFMPEG_CACHE).then(cache => cache.addAll(ffmpegAssets))
    ])
  );
  self.skipWaiting();
});

// فعال‌سازی Service Worker: حذف کش‌های قدیمی
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== FFMPEG_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// هندل کردن درخواست‌ها با استفاده از single-thread (بدون SharedArrayBuffer)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Message handler برای کنترل دستی
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});