import { ComplexFft } from './fft.js';
import { Demodulator } from './demodulators.js';
import { DemodulationMode } from '../types.js';

export interface SignalMetrics {
  powerDbm: number;
  snrDb: number;
  sMeter: number;
  squelchOpen: boolean;
}

export class DspEngine {
  readonly audioSampleRate = 48000;
  readonly fftSize = 1024;

  private fft: ComplexFft;
  private demodulator: Demodulator;
  private fftReal: Float32Array;
  private fftImag: Float32Array;
  readonly spectrumDb: Float32Array;
  private smoothedSpectrumDb: Float32Array;

  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  // Circular audio ring buffer for smooth playback
  private audioRingBuffer: Float32Array;
  private ringWriteIndex = 0;
  private ringReadIndex = 0;
  private readonly ringBufferSize = 48000 * 2; // 2 seconds

  // State
  private volume = 0.8;
  private muted = false;
  private squelchThresholdDb = -85;
  private squelchOpen = true;
  private currentPowerDbm = -100;
  private currentSnrDb = 0;
  private currentSmeter = 0;
  private mode: DemodulationMode = 'WFM';
  private agcEnabled = true;

  // Wireless Mic & Line-In Preamp
  private wirelessMicBoostDb = 0;
  private wirelessMicLinearGain = 1.0;

  // Audio recording tap callback
  public onAudioSampleCallback?: (sample: number) => void;

  constructor() {
    this.fft = new ComplexFft(this.fftSize, 'blackman');
    this.demodulator = new Demodulator(this.audioSampleRate);
    this.fftReal = new Float32Array(this.fftSize);
    this.fftImag = new Float32Array(this.fftSize);
    this.spectrumDb = new Float32Array(this.fftSize);
    this.smoothedSpectrumDb = new Float32Array(this.fftSize);
    this.smoothedSpectrumDb.fill(-110);
    this.audioRingBuffer = new Float32Array(this.ringBufferSize);
  }

  async startAudio(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: this.audioSampleRate });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Set up 2048-sample script processor for continuous low-latency audio streaming
    this.scriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.muted ? 0 : this.volume;

    this.scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      const len = output.length;

      for (let i = 0; i < len; i++) {
        let sample = 0;
        if (this.ringReadIndex !== this.ringWriteIndex) {
          sample = this.audioRingBuffer[this.ringReadIndex];
          this.ringReadIndex = (this.ringReadIndex + 1) % this.ringBufferSize;
        }

        // Apply squelch
        if (!this.squelchOpen) {
          sample = 0;
        }

        output[i] = sample;

        // Feed to recorder tap if active
        if (this.onAudioSampleCallback && !this.muted) {
          this.onAudioSampleCallback(sample);
        }
      }
    };

    this.scriptNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  stopAudio(): void {
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.ringReadIndex = 0;
    this.ringWriteIndex = 0;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
    }
  }

  setMode(mode: DemodulationMode): void {
    this.mode = mode;
    this.demodulator.reset();
  }

  setSquelchDb(db: number): void {
    this.squelchThresholdDb = db;
  }

  setAgcEnabled(enabled: boolean): void {
    this.agcEnabled = enabled;
  }

  // --- ADVANCED DIGITAL FILTERS CONFIGURATION ---
  setAnr(enabled: boolean, level: number = 5): void {
    this.demodulator.anr.enabled = enabled;
    this.demodulator.anr.setLevel(level);
  }

  setNotch(enabled: boolean, freqHz: number = 1000, q: number = 15): void {
    this.demodulator.notchEnabled = enabled;
    this.demodulator.configureNotch(this.audioSampleRate, freqHz, q);
  }

  setBandpassQ(centerHz: number, q: number): void {
    this.demodulator.configureBandpass(this.audioSampleRate, centerHz, q);
  }

  setWirelessMicOptions(boostDb: number, rumbleCut: boolean): void {
    this.wirelessMicBoostDb = boostDb;
    this.wirelessMicLinearGain = Math.pow(10, boostDb / 20);
    this.demodulator.rumbleEnabled = rumbleCut;
  }

  /**
   * Process a batch of raw complex IQ samples from an SDR receiver.
   */
  processIqBatch(iSamples: Float32Array, qSamples: Float32Array, sdrSampleRate: number): void {
    const numSamples = Math.min(iSamples.length, qSamples.length);
    if (numSamples === 0) return;

    // 1. Compute power in signal
    let sumSq = 0;
    for (let k = 0; k < numSamples; k++) {
      sumSq += iSamples[k] * iSamples[k] + qSamples[k] * qSamples[k];
    }
    const rms = Math.sqrt(sumSq / numSamples);
    const currentDbm = 10 * Math.log10(Math.max(rms * rms, 1e-12)) - 10;
    this.currentPowerDbm = 0.85 * this.currentPowerDbm + 0.15 * currentDbm;

    // Estimate noise floor and SNR
    const noiseFloorDbm = -105;
    this.currentSnrDb = Math.max(0, this.currentPowerDbm - noiseFloorDbm);

    // Compute S-meter (S9 = -73 dBm, 6 dB per S-unit)
    let sVal = Math.floor((this.currentPowerDbm - (-127)) / 6);
    sVal = Math.max(0, Math.min(9, sVal));
    this.currentSmeter = sVal;

    // Squelch gating
    this.squelchOpen = this.currentPowerDbm >= this.squelchThresholdDb;

    // 2. Compute FFT for real-time spectrum visualization
    const fftSamples = Math.min(numSamples, this.fftSize);
    for (let idx = 0; idx < this.fftSize; idx++) {
      if (idx < fftSamples) {
        this.fftReal[idx] = iSamples[idx];
        this.fftImag[idx] = qSamples[idx];
      } else {
        this.fftReal[idx] = 0;
        this.fftImag[idx] = 0;
      }
    }
    this.fft.calculatePowerSpectrum(this.fftReal, this.fftImag, this.spectrumDb, noiseFloorDbm);

    // Spectrum smoothing
    for (let s = 0; s < this.fftSize; s++) {
      this.smoothedSpectrumDb[s] = 0.65 * this.smoothedSpectrumDb[s] + 0.35 * this.spectrumDb[s];
    }

    // 3. Demodulation and decimation to audio rate (48 kHz) with advanced digital filtering
    const decimation = Math.max(1, Math.round(sdrSampleRate / this.audioSampleRate));
    for (let idx = 0; idx < numSamples; idx += decimation) {
      const iVal = iSamples[idx];
      const qVal = qSamples[idx];
      const audioSample = this.demodulator.demodulateSample(iVal, qVal, this.mode, this.agcEnabled);

      // Write to circular ring buffer
      const nextWrite = (this.ringWriteIndex + 1) % this.ringBufferSize;
      if (nextWrite !== this.ringReadIndex) {
        this.audioRingBuffer[this.ringWriteIndex] = audioSample;
        this.ringWriteIndex = nextWrite;
      }
    }
  }

  /**
   * Directly ingest a block of analog audio samples (from 3.5mm line-in or wireless mic receiver).
   * Applies wireless mic boost, rumble cut, notch filter, and ANR.
   */
  processAnalogAudioBatch(audioData: Float32Array): void {
    let sumSq = 0;
    const len = audioData.length;
    for (let k = 0; k < len; k++) {
      let s = audioData[k] * this.wirelessMicLinearGain;

      // Wireless mic rumble filter (80 Hz cut)
      if (this.demodulator.rumbleEnabled) {
        s = this.demodulator.rumbleHighpass.process(s);
      }

      // Notch filter
      if (this.demodulator.notchEnabled) {
        s = this.demodulator.notchFilter.process(s);
      }

      // Adaptive Noise Reduction
      if (this.demodulator.anr.enabled) {
        s = this.demodulator.anr.process(s);
      }

      sumSq += s * s;
      const nextWrite = (this.ringWriteIndex + 1) % this.ringBufferSize;
      if (nextWrite !== this.ringReadIndex) {
        this.audioRingBuffer[this.ringWriteIndex] = Math.max(-1, Math.min(1, s));
        this.ringWriteIndex = nextWrite;
      }
    }
    const rms = Math.sqrt(sumSq / len);
    this.currentPowerDbm = 10 * Math.log10(Math.max(rms * rms, 1e-12)) - 10;
    this.currentSnrDb = Math.max(0, this.currentPowerDbm - (-90));
    this.squelchOpen = true;

    // Line-in audio FFT
    for (let idx = 0; idx < this.fftSize; idx++) {
      this.fftReal[idx] = idx < len ? audioData[idx] * this.wirelessMicLinearGain : 0;
      this.fftImag[idx] = 0;
    }
    this.fft.calculatePowerSpectrum(this.fftReal, this.fftImag, this.spectrumDb, -90);
    for (let s = 0; s < this.fftSize; s++) {
      this.smoothedSpectrumDb[s] = 0.7 * this.smoothedSpectrumDb[s] + 0.3 * this.spectrumDb[s];
    }
  }

  getSignalMetrics(): SignalMetrics {
    return {
      powerDbm: Math.round(this.currentPowerDbm * 10) / 10,
      snrDb: Math.round(this.currentSnrDb * 10) / 10,
      sMeter: this.currentSmeter,
      squelchOpen: this.squelchOpen,
    };
  }

  getSmoothedSpectrum(): Float32Array {
    return this.smoothedSpectrumDb;
  }
}
