import { AudioRecordingItem, RadioBand, DemodulationMode } from '../types.js';

export class AudioRecorder {
  private recording = false;
  private recordedChunks: Float32Array[] = [];
  private totalSamples = 0;
  private sampleRate = 48000;
  private startTime = 0;
  private timerId: number | null = null;
  private elapsedSeconds = 0;

  public recordings: AudioRecordingItem[] = [];

  get isRecording(): boolean {
    return this.recording;
  }

  get durationSeconds(): number {
    return this.elapsedSeconds;
  }

  start(sampleRate: number = 48000): void {
    this.sampleRate = sampleRate;
    this.recordedChunks = [];
    this.totalSamples = 0;
    this.recording = true;
    this.startTime = Date.now();
    this.elapsedSeconds = 0;

    this.timerId = window.setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }, 500);
  }

  addSamples(samples: Float32Array): void {
    if (!this.recording) return;
    const copy = new Float32Array(samples);
    this.recordedChunks.push(copy);
    this.totalSamples += copy.length;
  }

  stop(frequencyHz: number, band: RadioBand, mode: DemodulationMode): AudioRecordingItem | null {
    if (!this.recording) return null;
    this.recording = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.totalSamples === 0) return null;

    // Merge chunks
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to 16-bit PCM WAV Blob
    const wavBlob = this.encodeWav(merged, this.sampleRate);
    const url = URL.createObjectURL(wavBlob);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const freqMhz = (frequencyHz / 1e6).toFixed(3);
    const fileName = `SmartRadio_${band}_${freqMhz}MHz_${mode}_${dateStr}.wav`;

    const item: AudioRecordingItem = {
      id: 'rec_' + Date.now(),
      timestamp: new Date(),
      frequencyHz,
      band,
      mode,
      durationSeconds: Math.max(1, this.elapsedSeconds),
      blob: wavBlob,
      url,
      fileName,
      sizeBytes: wavBlob.size,
    };

    this.recordings.unshift(item);
    return item;
  }

  downloadRecording(item: AudioRecordingItem): void {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write 16-bit PCM samples with clipping protection
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, int16, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
