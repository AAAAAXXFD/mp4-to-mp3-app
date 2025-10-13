const CACHE_NAME = 'mp3-converter-v6';
const STATIC_CACHE = 'static-v6';
const FFMPEG_CACHE = 'ffmpeg-v6';

// تشخیص مسیر base
const basePath = self.location.pathname.includes('/mp4-to-mp3-app/') 
  ? '/mp4-to-mp3-app' 
  : '.';

const staticAssets = [
  `${basePath}/`,
  `${basePath}/index.html`,
  `${basePath}/manifest.json`,
  `${basePath}/assets/css/main.css`,
  `${basePath}/assets/css/rtl.css`,
  `${basePath}/assets/css/animations.css`,
  `${basePath}/assets/js/app.js`,
  `${basePath}/assets/icons/icon-192.svg`,
  `${basePath}/assets/icons/icon-512.svg`
];

// نسخه 0.11.1 - پایدار
const ffmpegAssets = [
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.1/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.wasm',
  'https://unpkg.com/@ffmpeg/core@0.11.1/dist/ffmpeg-core.worker.js'
];

// نصب Service Worker: کش کردن استاتیک و ffmpeg assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(staticAssets).catch(err => {
          console.warn('[SW] Some static assets failed:', err);
        });
      }),
      
      caches.open(FFMPEG_CACHE).then(cache => {
        console.log('[SW] Caching FFmpeg (may take a while...)');
        // کش کردن یکی یکی برای جلوگیری از timeout
        return Promise.allSettled(
          ffmpegAssets.map(url => 
            cache.add(url).catch(err => {
              console.warn('[SW] Failed to cache:', url, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

// فعال‌سازی Service Worker: حذف کش‌های قدیمی
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== FFMPEG_CACHE)
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

// هندل کردن درخواست‌ها با استفاده از single-thread (بدون SharedArrayBuffer)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // CDN resources - Cache First
  if (url.hostname.includes('unpkg.com') || 
      url.hostname.includes('jsdelivr.net')) {
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }
        
        console.log('[SW] Fetching:', url.pathname);
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(FFMPEG_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Static assets - Cache First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match(`${basePath}/index.html`);
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