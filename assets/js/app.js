// ===== MP4 to MP3 Speed Adjuster - Main Application =====
// Progressive Web App for converting videos to MP3 and adjusting speed

// ===== Global State =====
window.state = {
  files: [],
  targetDuration: 60,
  ffmpeg: null,
  currentProcessing: 0,
  results: []
};

// ===== DOM Elements =====
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

// ===== Initialization =====
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

// ===== Event Listeners Setup =====
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

// ===== Browser Support Check =====
function checkBrowserSupport() {
  const requiredFeatures = {
    FileAPI: typeof File !== 'undefined',
    AudioAPI: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    WebAssembly: typeof WebAssembly !== 'undefined'
  };

  const unsupported = Object.entries(requiredFeatures)
    .filter(([_, supported]) => !supported)
    .map(([key]) => key);

  if (unsupported.length > 0) {
    showToast(`مرورگر از ویژگی‌های لازم پشتیبانی نمی‌کند: ${unsupported.join(', ')}`, 'error');
    console.error('Missing features:', unsupported);
    return false;
  }
  return true;
}

// ===== File Handling =====
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
    li.className = 'file-item';
    li.innerHTML = `
      <span>${escapeHtml(file.name)} (${formatFileSize(file.size)})</span>
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

// ===== Navigation Between Sections =====
function showSection(section) {
  console.log('🔹 Navigating to:', section);
  
  // پنهان کردن همه sections
  const sections = {
    upload: elements.uploadSection,
    settings: elements.settingsSection,
    processing: elements.processingSection,
    results: elements.resultsSection
  };
  
  // حذف active و اضافه hidden از همه
  Object.values(sections).forEach(s => {
    if (s) {
      s.classList.remove('active');
      s.classList.add('hidden');
    }
  });
  
  // نمایش section مورد نظر
  const targetSection = sections[section];
  if (targetSection) {
    targetSection.classList.remove('hidden');
    targetSection.classList.add('active');
    console.log('✅ Section shown:', section);
  }
}

function showSettings() {
  if (window.state.files.length === 0) {
    showToast('لطفاً حداقل یک فایل انتخاب کنید', 'error');
    return;
  }
  showSection('settings');
}

// ===== Processing Workflow =====
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
    // Load FFmpeg
    await loadFFmpeg();

    elements.totalFiles.textContent = window.state.files.length;
    
    // Process each file
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
      elements.fileProgress.textContent = `${Math.round(progress)}%`;
    }
    
    showResults();
  } catch (error) {
    console.error('❌ Processing error:', error);
    showToast('خطا در پردازش فایل‌ها: ' + error.message, 'error');
  }
}

// ===== FFmpeg Loading - FIXED for 0.10.0 API =====
async function loadFFmpeg() {
  if (window.state.ffmpeg) return;
  
  console.log('🔄 Starting FFmpeg load...');
  showToast('در حال بارگذاری ابزار پردازش...', 'info');
  
  try {
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    
    const ffmpeg = createFFmpeg({
      log: false,
      // نسخه single-thread که SharedArrayBuffer نمی‌خواهد
      corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
      progress: ({ ratio }) => {
        const percent = Math.round(ratio * 100);
        if (elements.ffmpegProgress) {
          elements.ffmpegProgress.style.width = percent + '%';
          elements.ffmpegProgress.textContent = percent + '%';
        }
      }
    });
    
    await ffmpeg.load();
    
    window.state.ffmpeg = ffmpeg;
    window.fetchFile = fetchFile;
    
    console.log('✅ FFmpeg loaded!');
    showToast('ابزار پردازش آماده شد', 'success');
    
  } catch (error) {
    console.error('❌ Error:', error);
    showToast('خطا: ' + error.message, 'error');
    throw error;
  }
}

// ===== File Processing =====
async function processFile(file) {
  const startTime = Date.now();

  try {
    // ابتدا تبدیل به MP3
    const mp3Blob = await convertToMP3(file);
    const originalDuration = await getAudioDuration(mp3Blob);

    // محاسبه نسبت سرعت
    const speedRatio = originalDuration / window.state.targetDuration;
    
    // اگر نیاز به تغییر سرعت است
    let adjustedBlob = mp3Blob;
    let newDuration = originalDuration;
    
    if (Math.abs(speedRatio - 1) > 0.01) { // اگر تغییر بیش از 1% باشد
      console.log(`⚡ Adjusting speed by ${speedRatio.toFixed(2)}x`);
      adjustedBlob = await adjustAudioSpeed(mp3Blob, speedRatio);
      newDuration = await getAudioDuration(adjustedBlob);
    }

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
    console.error('❌ خطا در پردازش فایل:', file.name, error);
    return {
      name: file.name,
      status: 'error',
      error: error.message
    };
  }
}

async function convertToMP3(videoFile) {
  const ffmpeg = window.state.ffmpeg;
  
  if (!ffmpeg || !ffmpeg.isLoaded()) {
    throw new Error('FFmpeg is not loaded');
  }
  
  const inputName = `input_${Date.now()}.mp4`;
  const outputName = `output_${Date.now()}.mp3`;
  
  console.log(`🎬 Converting ${videoFile.name} to MP3...`);
  
  try {
    // استفاده از fetchFile از window
    const fileData = await window.fetchFile(videoFile);
    
    // نوشتن فایل
    ffmpeg.FS('writeFile', inputName, fileData);
    
    console.log('File written, starting conversion...');
    
    // اجرای تبدیل
    await ffmpeg.run(
      '-i', inputName,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputName
    );
    
    console.log('Conversion complete, reading output...');
    
    // خواندن خروجی
    const data = ffmpeg.FS('readFile', outputName);
    
    // پاک کردن فایل‌های موقت
    try {
      ffmpeg.FS('unlink', inputName);
      ffmpeg.FS('unlink', outputName);
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    
    console.log(`✅ Conversion complete`);
    return new Blob([data.buffer], { type: 'audio/mp3' });
    
  } catch (error) {
    console.error('Conversion error:', error);
    
    // Clean up در صورت خطا
    try {
      ffmpeg.FS('unlink', inputName);
    } catch (e) {}
    try {
      ffmpeg.FS('unlink', outputName);
    } catch (e) {}
    
    throw error;
  }
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

async function adjustAudioSpeed(audioBlob, speedRatio) {
  const ffmpeg = window.state.ffmpeg;
  
  if (!ffmpeg || !ffmpeg.isLoaded()) {
    throw new Error('FFmpeg is not loaded');
  }
  
  const inputName = `input_audio_${Date.now()}.mp3`;
  const outputName = `output_adjusted_${Date.now()}.mp3`;
  
  console.log(`🎚️ Adjusting speed by ${speedRatio.toFixed(2)}x`);
  
  try {
    // تبدیل blob به Uint8Array
    const audioData = new Uint8Array(await audioBlob.arrayBuffer());
    
    // نوشتن فایل ورودی
    ffmpeg.FS('writeFile', inputName, audioData);
    
    // محاسبه atempo (بین 0.5 تا 2.0)
    let tempoFilter = '';
    let tempo = speedRatio;
    
    // FFmpeg atempo محدودیت 0.5 تا 2.0 دارد
    // برای سرعت‌های بالاتر باید زنجیره‌ای استفاده کنیم
    if (tempo > 4) {
      tempoFilter = 'atempo=2.0,atempo=2.0';
    } else if (tempo > 2) {
      tempoFilter = `atempo=2.0,atempo=${(tempo / 2).toFixed(2)}`;
    } else if (tempo < 0.5) {
      tempoFilter = 'atempo=0.5';
    } else {
      tempoFilter = `atempo=${tempo.toFixed(2)}`;
    }
    
    console.log('Using filter:', tempoFilter);
    
    // اجرای FFmpeg با فیلتر atempo
    await ffmpeg.run(
      '-i', inputName,
      '-filter:a', tempoFilter,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputName
    );
    
    // خواندن خروجی
    const data = ffmpeg.FS('readFile', outputName);
    
    // پاک کردن فایل‌های موقت
    try {
      ffmpeg.FS('unlink', inputName);
      ffmpeg.FS('unlink', outputName);
    } catch (e) {}
    
    console.log(`✅ Speed adjusted successfully`);
    return new Blob([data.buffer], { type: 'audio/mp3' });
    
  } catch (error) {
    console.error('Speed adjustment error:', error);
    
    // Clean up
    try {
      ffmpeg.FS('unlink', inputName);
      ffmpeg.FS('unlink', outputName);
    } catch (e) {}
    
    throw error;
  }
}

// ===== Results Display =====
function showResults() {
  showSection('results');
  elements.resultsTableBody.innerHTML = '';
  
  window.state.results.forEach(result => {
    const tr = document.createElement('tr');
    
    if (result.status === 'success') {
            // ذخیره نام فایل برای دانلود
      const safeFileName = escapeHtml(result.name);
      const dataIndex = window.state.results.indexOf(result);
      
      tr.innerHTML = `
        <td>${safeFileName}</td>
        <td>${result.originalDuration} ثانیه</td>
        <td>${result.newDuration} ثانیه</td>
        <td>${result.speedRatio}x</td>
        <td>
          <button onclick="downloadFile(${dataIndex})" class="btn btn-primary btn-sm">
            دانلود
          </button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td colspan="5" style="color: #dc3545;">
          ❌ ${escapeHtml(result.name)} - خطا: ${escapeHtml(result.error)}
        </td>
      `;
    }
    
    elements.resultsTableBody.appendChild(tr);
  });
  
  showToast('پردازش با موفقیت انجام شد!', 'success');
  console.log('✅ All files processed successfully!');
}

function downloadFile(index) {
  const result = window.state.results[index];
  
  if (!result || !result.blob) {
    showToast('فایل یافت نشد', 'error');
    return;
  }

  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
  
  showToast('دانلود شروع شد', 'success');
  console.log('📥 Download started:', result.name);
}

// ===== Reset Application =====
function resetApp() {
  window.state.files = [];
  window.state.results = [];
  window.state.currentProcessing = 0;
  elements.fileInput.value = '';
  elements.filesList.classList.add('hidden');
  
  // Reset progress bars
  if (elements.ffmpegProgress) {
    elements.ffmpegProgress.style.width = '0%';
    elements.ffmpegProgress.textContent = '0%';
  }
  if (elements.fileProgress) {
    elements.fileProgress.style.width = '0%';
    elements.fileProgress.textContent = '0%';
  }
  
  showSection('upload');
  showToast('برنامه بازنشانی شد', 'info');
  console.log('🔄 App reset');
}

// ===== Utility Functions =====
function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast toast-${type}`;
  elements.toast.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Global Functions (for inline event handlers) =====
window.removeFile = removeFile;
window.downloadFile = downloadFile;

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);

// ===== Service Worker Registration (Optional) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.log('⚠️ Service Worker registration failed:', error);
      });
  });
}

console.log('📱 MP4 to MP3 Adjuster - Script loaded');