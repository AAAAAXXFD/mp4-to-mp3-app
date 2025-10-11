// ===== Robust FFmpeg Loader (UMD + toBlobURL) =====
async function loadFFmpeg() {
    if (state.ffmpeg) return;

    showToast('در حال بارگذاری ابزار پردازش...', 'info');

    // اطمینان از وجود UMD در window (در صورت تاخیر CDN، پویا بارگذاری می‌کنیم)
    if (typeof window.FFmpeg === 'undefined' || typeof window.FFmpegUtil === 'undefined') {
        await new Promise((resolve, reject) => {
            const add = (src) => new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = src; s.async = true;
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            });
            add('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js')
              .then(() => add('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.10/dist/umd/index.js'))
              .then(resolve).catch(reject);
        });
    }

    const { FFmpeg } = window.FFmpeg;
    const { toBlobURL } = window.FFmpegUtil;

    // نوار پیشرفت
    state.ffmpeg = new FFmpeg();
    state.ffmpeg.on('progress', ({ progress }) => {
        elements.ffmpegProgress.style.width = ((progress || 0) * 100) + '%';
    });

    // بارگذاری core/wasm به روش توصیه‌شده (بدون نیاز به COOP/COEP)
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

    await state.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    elements.ffmpegProgress.style.width = '100%';
    showToast('ابزار پردازش آماده شد', 'success');
}
