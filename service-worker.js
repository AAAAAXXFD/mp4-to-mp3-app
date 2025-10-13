const CACHE_NAME = 'offline-app-v1';

// مسیرهای نسبی برای GitHub Pages
const urlsToCache = [
  './',
  './index.html',
  './assets/js/app.js',
  './assets/css/main.css',
  './assets/css/rtl.css',
  './assets/css/animations.css',
  './manifest.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
  // حذف فایل‌های vendor چون از CDN استفاده می‌کنیم
];

self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app files');
        // اضافه کردن با error handling برای هر فایل
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              // ادامه نصب حتی اگر یک فایل cache نشد
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] Install completed');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      })
    )).then(() => {
      console.log('[SW] Activation completed');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension و non-http requests
  if (url.protocol === 'chrome-extension:' || !url.protocol.startsWith('http')) {
    return;
  }
  
  // مدیریت فایل‌های FFmpeg از CDN
  if (url.hostname === 'unpkg.com' && url.pathname.includes('ffmpeg')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('[SW] FFmpeg from cache:', url.pathname);
            return response;
          }
          
          console.log('[SW] Fetching FFmpeg:', url.pathname);
          return fetch(request)
            .then(response => {
              // کش کردن FFmpeg برای استفاده آفلاین
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseToCache);
                  console.log('[SW] Cached FFmpeg:', url.pathname);
                });
              }
              return response;
            })
            .catch(err => {
              console.error('[SW] FFmpeg fetch failed:', err);
              return new Response('FFmpeg not available offline', { status: 503 });
            });
        })
    );
    return;
  }
  
  // مدیریت سایر درخواست‌ها
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          console.log('[SW] From cache:', url.pathname);
          return response;
        }
        
        console.log('[SW] Fetching:', url.pathname);
        return fetch(request)
          .then(response => {
            // فقط کش کردن response های موفق از origin خودمان
            if (response && response.status === 200 && url.origin === location.origin) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(err => {
            console.error('[SW] Fetch failed:', err);
            // Fallback برای صفحه اصلی
            if (request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// پیام از client برای skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});