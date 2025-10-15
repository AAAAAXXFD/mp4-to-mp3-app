// پردازشگر صوتی جایگزین FFmpeg
class AudioProcessor {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // استخراج صدا از ویدیو MP4
  async extractAudioFromVideo(videoFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);
      
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      
      video.onloadedmetadata = async () => {
        try {
          // ایجاد MediaStream از ویدیو
          const stream = video.captureStream ? 
            video.captureStream() : 
            video.mozCaptureStream();
          
          // تنظیمات ضبط
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          
          const chunks = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            document.body.removeChild(video);
            URL.revokeObjectURL(url);
            resolve(audioBlob);
          };
          
          // شروع پخش و ضبط
          mediaRecorder.start();
          video.play();
          
          // توقف در انتها
          video.onended = () => {
            mediaRecorder.stop();
          };
          
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = reject;
    });
  }

  // تغییر سرعت با حفظ pitch
  async adjustSpeed(audioBlob, speedRatio) {
    try {
      // تبدیل به AudioBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // محاسبه مدت زمان جدید
      const newDuration = audioBuffer.duration / speedRatio;
      const newLength = Math.floor(audioBuffer.sampleRate * newDuration);
      
      // ایجاد OfflineAudioContext
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
      );
      
      // ایجاد BufferSource با تنظیم سرعت
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speedRatio;
      source.connect(offlineContext.destination);
      source.start(0);
      
      // رندر کردن
      const renderedBuffer = await offlineContext.startRendering();
      return renderedBuffer;
      
    } catch (error) {
      console.error('Speed adjustment error:', error);
      throw error;
    }
  }

  // تبدیل AudioBuffer به MP3
  async encodeToMp3(audioBuffer, bitrate = 128) {
    const mp3encoder = new lamejs.Mp3Encoder(
      audioBuffer.numberOfChannels,
      audioBuffer.sampleRate,
      bitrate
    );
    
    const mp3Data = [];
    
    // گرفتن داده‌های کانال‌ها
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? 
      audioBuffer.getChannelData(1) : left;
    
    // تبدیل Float32 به Int16
    const leftInt16 = this.convertFloat32ToInt16(left);
    const rightInt16 = this.convertFloat32ToInt16(right);
    
    // Encode در بلاک‌های 1152 نمونه
    const sampleBlockSize = 1152;
    
    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }
    }
    
    // Flush باقی‌مانده
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf));
    }
    
    // ترکیب همه chunks
    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  // Helper: تبدیل Float32 به Int16
  convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf;
  }

  // متد اصلی: پردازش کامل ویدیو
  async processVideo(videoFile, targetDuration) {
    console.log(`🎬 Processing ${videoFile.name}`);
    
    try {
      // 1. استخراج صدا
      console.log('📤 Extracting audio...');
      const audioBlob = await this.extractAudioFromVideo(videoFile);
      
      // 2. دریافت مدت زمان اصلی
      const tempBuffer = await this.audioContext.decodeAudioData(
        await audioBlob.arrayBuffer()
      );
      const originalDuration = tempBuffer.duration;
      console.log(`⏱️ Original duration: ${originalDuration.toFixed(1)}s`);
      
      // 3. محاسبه نسبت سرعت
      const speedRatio = originalDuration / targetDuration;
      console.log(`⚡ Speed ratio: ${speedRatio.toFixed(2)}x`);
      
      // 4. تغییر سرعت
      console.log('🎚️ Adjusting speed...');
      const adjustedBuffer = await this.adjustSpeed(audioBlob, speedRatio);
      
      // 5. تبدیل به MP3
      console.log('🎵 Encoding to MP3...');
      const mp3Blob = await this.encodeToMp3(adjustedBuffer);
      
      console.log(`✅ Processing complete! Size: ${(mp3Blob.size / 1024).toFixed(1)}KB`);
      
      return {
        blob: mp3Blob,
        originalDuration: originalDuration,
        newDuration: adjustedBuffer.duration,
        speedRatio: speedRatio
      };
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      throw error;
    }
  }
}

// ایجاد instance global
window.audioProcessor = new AudioProcessor();
