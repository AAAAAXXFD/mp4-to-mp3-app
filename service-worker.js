const CACHE_NAME = 'mp3-converter-v4';
const STATIC_CACHE = 'static-v4';
const FFMPEG_CACHE = 'ffmpeg-v4';

// فایل‌های استاتیک ما
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

// فایل‌های FFmpeg از CDN که باید کش شوند
const ffmpegAssets = [
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.wasm'
];

// Install - دانلود و کش کردن همه چیز
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      // کش کردن فایل‌های استاتیک
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(staticAssets);
      }),
      
      // کش کردن FFmpeg
      caches.open(FFMPEG_CACHE).then(cache => {
        console.log('[SW] Caching FFmpeg assets');
        return cache.addAll(ffmpegAssets).catch(err => {
          console.warn('[SW] FFmpeg cache failed (will try at runtime):', err);
        });
      })
    ]).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

// Activate - پاک کردن کش‌های قدیمی
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => 
            name !== STATIC_CACHE && 
            name !== FFMPEG_CACHE
          )
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activate complete');
      return self.clients.claim();
    })
  );
});

// Fetch - استراتژی Cache First
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // برای CDN: Cache First, با fallback به Network
  if (url.hostname.includes('unpkg.com') || 
      url.hostname.includes('jsdelivr.net')) {
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }
        
        // اگر در کش نبود، دانلود و کش کن
        console.log('[SW] Fetching and caching:', url.pathname);
        return fetch(event.request).then(response => {
          // فقط اگر موفق بود کش کن
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(FFMPEG_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(err => {
          console.error('[SW] Fetch failed:', url.pathname, err);
          throw err;
        });
      })
    );
    return;
  }
  
  // برای فایل‌های محلی: Cache First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // اگر offline بود و فایل در کش نبود
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
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