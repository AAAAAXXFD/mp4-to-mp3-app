const CACHE_NAME = 'mp3-converter-v7';

// تشخیص GitHub Pages
const isGitHubPages = self.location.hostname === 'aaaaaxxfd.github.io';
const basePath = isGitHubPages ? '/mp4-to-mp3-app' : '';

const staticAssets = [
  `${basePath}/`,
  `${basePath}/index.html`,
  `${basePath}/manifest.json`,
  `${basePath}/assets/css/main.css`,
  `${basePath}/assets/css/rtl.css`,
  `${basePath}/assets/css/animations.css`,
  `${basePath}/assets/js/app.js`
].filter(path => path); // حذف مسیرهای خالی

const ffmpegAssets = [
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.wasm'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching all assets...');
      return Promise.allSettled([
        ...staticAssets.map(url => cache.add(url)),
        ...ffmpegAssets.map(url => cache.add(url))
      ]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match(`${basePath}/index.html`))
  );
});