// --- Robust loader: UMD fallback + toBlobURL (per official docs) ---
async function loadFFmpeg() {
  if (state.ffmpeg) return;

  showToast('در حال بارگذاری ابزار پردازش...', 'info');

  // 1) اطمینان از UMD روی window با fallback بین دو CDN
  async function ensureScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureUMD() {
    if (typeof window.FFmpeg !== 'undefined' && typeof window.FFmpegUtil !== 'undefined') return;

    const pairs = [
      [
        'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
        'https://unpkg.com/@ffmpeg/util@0.12.10/dist/umd/index.js'
      ],
      [
        'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.10/dist/umd/index.js'
      ]
    ];

    for (const [ffmpegUrl, utilUrl] of pairs) {
      try {
        await ensureScript(ffmpegUrl);
        await ensureScript(utilUrl);
        if (typeof window.FFmpeg !== 'undefined' && typeof window.FFmpegUtil !== 'undefined') return;
      } catch (e) {
        // ادامه می‌دهیم تا CDN بعدی تست شود
      }
    }
    throw new Error('Cannot load FFmpeg UMD from CDNs');
  }

  await ensureUMD(); // طبق مستندات باید window.FFmpeg و window.FFmpegUtil حاضر شوند
  const { FFmpeg } = window.FFmpeg;
  const { toBlobURL } = window.FFmpegUtil;

  // 2) لود هسته با toBlobURL (سازگار با GitHub Pages و بدون نیاز به crossOriginIsolated)
  const baseURLs = [
    'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd',
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd'
  ];

  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    elements.ffmpegProgress.style.width = ((progress || 0) * 100) + '%';
  });

  let lastErr;
  for (const baseURL of baseURLs) {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      state.ffmpeg = ffmpeg;
      elements.ffmpegProgress.style.width = '100%';
      showToast('ابزار پردازش آماده شد', 'success');
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('FFmpeg core load failed');
}
// --- End robust loader ---
