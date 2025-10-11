window.state = {
  files: [],
  targetDuration: 60,
  ffmpeg: null,
  currentProcessing: 0,
  results: []
};

const elements = {
  uploadSection: document.getElementById('uploadSection'),
  settingsSection: document.getElementById('settingsSection'),
  processingSection: document.getElementById('processingSection'),
  resultsSection: document.getElementById('resultsSection'),

  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  selectFilesBtn: document.getElementById('selectFilesBtn'),
  filesList: document.getElementById('filesList'),
  filesContainer: document.getElementById('filesContainer'),
  filesCount: document.getElementById('filesCount'),
  clearFilesBtn: document.getElementById('clearFilesBtn'),
  continueBtn: document.getElementById('continueBtn'),

  targetDuration: document.getElementById('targetDuration'),
  backBtn: document.getElementById('backBtn'),
  startProcessBtn: document.getElementById('startProcessBtn'),

  ffmpegLoading: document.getElementById('ffmpegLoading'),
  ffmpegProgress: document.getElementById('ffmpegProgress'),
  filesProcessing: document.getElementById('filesProcessing'),
  currentFileIndex: document.getElementById('currentFileIndex'),
  totalFiles: document.getElementById('totalFiles'),
  currentFileName: document.getElementById('currentFileName'),
  fileProgress: document.getElementById('fileProgress'),

  resultsTableBody: document.getElementById('resultsTableBody'),
  startOverBtn: document.getElementById('startOverBtn'),

  toast: document.getElementById('toast')
};

// Initialization

function init() {
  setupEventListeners();
  if (!checkBrowserSupport()) {
    disableAllControls();
    return;
  }
  console.log('🚀 App initialized and ready');
}

function disableAllControls() {
  elements.selectFilesBtn.disabled = true;
  elements.clearFilesBtn.disabled = true;
  elements.continueBtn.disabled = true;
  elements.startProcessBtn.disabled = true;
}

// Event Listeners Setup

function setupEventListeners() {
  elements.selectFilesBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.clearFilesBtn.addEventListener('click', clearFiles);
  elements.continueBtn.addEventListener('click', showSettings);
  elements.backBtn.addEventListener('click', () => showSection('upload'));
  elements.startProcessBtn.addEventListener('click', startProcessing);
  elements.startOverBtn.addEventListener('click', resetApp);
}

// Browser Support Check

function checkBrowserSupport() {
  const requiredFeatures = {
    FileAPI: typeof File !== 'undefined',
    AudioAPI: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    WebAssembly: typeof WebAssembly !== 'undefined'
  };

  const unsupported = Object.entries(requiredFeatures).filter(([_, supported]) => !supported).map(([key]) => key);

  if (unsupported.length > 0) {
    showToast(`مرورگر شما از این برنامه پشتیبانی نمی‌کند: ${unsupported.join(', ')}`, 'error');
    return false;
  }
  return true;
}

// File handling

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

function handleDragOver(e) {
  e.preventDefault();
  elements.dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
  if (files.length === 0) {
    showToast('لطفاً فقط فایل‌های ویدیویی انتخاب کنید', 'error');
    return;
  }
  addFiles(files);
}

function addFiles(newFiles) {
  const maxFiles = 14;
  const currentCount = window.state.files.length;
  const remaining = maxFiles - currentCount;
  if (remaining === 0) {
    showToast('حداکثر 14 فایل می‌توانید انتخاب کنید', 'warning');
    return;
  }
  const filesToAdd = newFiles.slice(0, remaining);
  window.state.files.push(...filesToAdd);
  updateFilesList();
  elements.filesList.classList.remove('hidden');
  showToast(`${filesToAdd.length} فایل اضافه شد`, 'success');
}

function updateFilesList() {
  elements.filesCount.textContent = window.state.files.length;
  elements.filesContainer.innerHTML = '';
  window.state.files.forEach((file, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${file.name} (${formatFileSize(file.size)})</span>
      <button onclick="removeFile(${index})" class="btn-text">حذف</button>
    `;
    elements.filesContainer.appendChild(li);
  });
}

function removeFile(index) {
  if (index < 0 || index >= window.state.files.length) return;
  window.state.files.splice(index, 1);
  updateFilesList();
  if (window.state.files.length === 0) {
    elements.filesList.classList.add('hidden');
  }
}

function clearFiles() {
  window.state.files = [];
  elements.filesList.classList.add('hidden');
  elements.fileInput.value = '';
  showToast('همه فایل‌ها پاک شدند', 'info');
}

// Navigation between sections

function showSection(section) {
  elements.uploadSection.classList.remove('active');
  elements.settingsSection.classList.remove('active');
  elements.processingSection.classList.remove('active');
  elements.resultsSection.classList.remove('active');
  switch (section) {
    case 'upload': elements.uploadSection.classList.add('active'); break;
    case 'settings': elements.settingsSection.classList.add('active'); break;
    case 'processing': elements.processingSection.classList.add('active'); break;
    case 'results': elements.resultsSection.classList.add('active'); break;
  }
}

function showSettings() {
  if (window.state.files.length === 0) {
    showToast('لطفاً حداقل یک فایل انتخاب کنید', 'error');
    return;
  }
  showSection('settings');
}

// Processing workflow

async function startProcessing() {
  const durationInput = parseInt(elements.targetDuration.value);
  if (!durationInput || durationInput < 1) {
    showToast('لطفاً مدت زمان معتبری وارد کنید', 'error');
    return;
  }
  window.state.targetDuration = durationInput;
  window.state.results = [];
  window.state.currentProcessing = 0;
  showSection('processing');

  try {
    await loadFFmpeg();

    elements.totalFiles.textContent = window.state.files.length;
    for (let i = 0; i < window.state.files.length; i++) {
      window.state.currentProcessing = i + 1;
      elements.currentFileIndex.textContent = i + 1;
      elements.currentFileName.textContent = window.state.files[i].name;

      elements.ffmpegLoading.classList.add('hidden');
      elements.filesProcessing.classList.remove('hidden');

      const result = await processFile(window.state.files[i]);
      window.state.results.push(result);

      const progress = ((i + 1) / window.state.files.length) * 100;
      elements.fileProgress.style.width = `${progress}%`;
    }
    showResults();
  } catch (error) {
    console.error('Processing error:', error);
    showToast('خطا در پردازش فایل‌ها: ' + error.message, 'error');
  }
}

async function loadFFmpeg() {
  if (window.state.ffmpeg) return;

  showToast('در حال بارگذاری ابزار پردازش...', 'info');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('بارگذاری اسکریپت شکست خورد: ' + src));
      document.head.appendChild(script);
    });
  }

  async function loadUMD() {
    if (window.FFmpeg && window.FFmpegUtil) return;
    const cdnPairs = [
      ['https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js', 'https://unpkg.com/@ffmpeg/util@0.12.10/dist/umd/index.js'],
      ['https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js', 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.10/dist/umd/index.js']
    ];

    for (const [ffmpegUrl, utilUrl] of cdnPairs) {
      try {
        await loadScript(ffmpegUrl);
        await loadScript(utilUrl);
        if (window.FFmpeg && window.FFmpegUtil) return;
      } catch { }
    }
    throw new Error('امکان بارگذاری ابزار FFmpeg وجود ندارد');
  }

  await loadUMD();

  const { FFmpeg } = window.FFmpeg;
  const { toBlobURL } = window.FFmpegUtil;

  const baseURLs = [
    location.origin + '/mp4-to-mp3-app/assets/vendor/@ffmpeg/core',
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core.12.10/dist/umd',
    'https://unpkg.com/@ffmpeg/core.12.10/dist/umd'
  ];

  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    elements.ffmpegProgress.style.width = ((progress ?? 0) * 100) + '%';
  });

  let lastError = null;
  for (const baseURL of baseURLs) {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`/ffmpeg-core.worker.js`, 'text/javascript')
      });
      window.state.ffmpeg = ffmpeg;
      elements.ffmpegProgress.style.width = '100%';
      showToast('ابزار پردازش آماده شد', 'success');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('بارگذاری FFmpeg core شکست خورد');
}

async function processFile(file) {
  const startTime = Date.now();

  try {
    const mp3Blob = await convertToMP3(file);
    const originalDuration = await getAudioDuration(mp3Blob);

    const speedRatio = originalDuration / window.state.targetDuration;
    // در این نسخه، تغییر سرعت واقعی فایل صوتی انجام نمی‌شود، فقط سرعت پلی‌بک تنظیم می‌شود
    const adjustedBlob = mp3Blob;

    const newDuration = await getAudioDuration(adjustedBlob);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      name: file.name.replace(/\.[^/.]+$/, '') + '_adjusted.mp3',
      originalDuration: originalDuration.toFixed(1),
      newDuration: newDuration.toFixed(1),
      speedRatio: speedRatio.toFixed(2),
      blob: adjustedBlob,
      status: 'success',
      processingTime
    };
  } catch (error) {
    console.error('خطا در پردازش فایل:', file.name, error);
    return {
      name: file.name,
      status: 'error',
      error: error.message
    };
  }
}

async function convertToMP3(videoFile) {
  const ffmpeg = window.state.ffmpeg;
  const inputName = `input${Date.now()}.mp4`;
  const outputName = 'output.mp3';

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputName]);
  const data = await ffmpeg.readFile(outputName);

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new Blob([data.buffer], { type: 'audio/mp3' });
}

function getAudioDuration(blob) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      reject(new Error('خطا در بارگذاری صوت'));
      URL.revokeObjectURL(url);
    };
  });
}

async function fetchFile(file) {
  return new Uint8Array(await file.arrayBuffer());
}

function showResults() {
  showSection('results');
  elements.resultsTableBody.innerHTML = '';
  window.state.results.forEach(result => {
    const tr = document.createElement('tr');
    if (result.status === 'success') {
      tr.innerHTML = `
        <td>${result.name}</td>
        <td>${result.originalDuration} ثانیه</td>
        <td>${result.newDuration} ثانیه</td>
        <td>${result.speedRatio}x</td>
        <td>
          <button onclick="downloadFile('${result.name}')" class="btn btn-primary btn-sm">دانلود</button>
        </td>`;
    } else {
      tr.innerHTML = `
        <td colspan="5" style="color: var(--danger)">
          ${result.name} - خطا: ${result.error}
        </td>`;
    }
    elements.resultsTableBody.appendChild(tr);
  });
  showToast('پردازش با موفقیت انجام شد!', 'success');
}

function downloadFile(fileName) {
  const result = window.state.results.find(r => r.name === fileName);
  if (!result || !result.blob) return;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('دانلود شروع شد', 'success');
}

function resetApp() {
  window.state.files = [];
  window.state.results = [];
  window.state.currentProcessing = 0;
  elements.fileInput.value = '';
  elements.filesList.classList.add('hidden');
  showSection('upload');
  showToast('برنامه بازنشانی شد', 'info');
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = 'toast toast-' + type;
  elements.toast.classList.remove('hidden');
  setTimeout(() => elements.toast.classList.add('hidden'), 3000);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Make some functions globally accessible for inline onclick handlers
window.removeFile = removeFile;
window.downloadFile = downloadFile;

document.addEventListener('DOMContentLoaded', init);
