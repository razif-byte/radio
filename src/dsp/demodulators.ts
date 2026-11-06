import { DemodulationMode } from '../types.js';

/**
 * High-performance audio filters, AGC, Demodulators, and Advanced DSP Filters
 * (Adaptive Noise Reduction, Notch Filter, Highpass Rumble Filter, and Tunable Bandpass).
 */

export class BiquadFilter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  setLowpass(sampleRate: number, cutoffHz: number, q: number = 0.707): void {
    const w0 = (2 * Math.PI * Math.min(cutoffHz, sampleRate * 0.49)) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (1 - cosw0) / 2 / a0;
    this.b1 = (1 - cosw0) / a0;
    this.b2 = (1 - cosw0) / 2 / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setHighpass(sampleRate: number, cutoffHz: number, q: number = 0.707): void {
    const w0 = (2 * Math.PI * Math.max(10, Math.min(cutoffHz, sampleRate * 0.49))) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (1 + cosw0) / 2 / a0;
    this.b1 = -(1 + cosw0) / a0;
    this.b2 = (1 + cosw0) / 2 / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setBandpass(sampleRate: number, centerHz: number, bandwidthHz: number): void {
    const q = Math.max(0.1, centerHz / Math.max(10, bandwidthHz));
    this.setBandpassQ(sampleRate, centerHz, q);
  }

  setBandpassQ(sampleRate: number, centerHz: number, q: number): void {
    const w0 = (2 * Math.PI * Math.min(centerHz, sampleRate * 0.49)) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setNotch(sampleRate: number, notchFreqHz: number, q: number = 10.0): void {
    const safeFreq = Math.max(20, Math.min(notchFreqHz, sampleRate * 0.49));
    const w0 = (2 * Math.PI * safeFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.5, q));
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = 1 / a0;
    this.b1 = (-2 * cosw0) / a0;
    this.b2 = 1 / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return isNaN(y) ? 0 : y;
  }

  reset(): void {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}

/**
 * Adaptive Noise Reduction (ANR) using Normalized Least Mean Squares (NLMS)
 * line enhancer algorithm. Extracts periodic signal (voice / tone) from stochastic RF noise / static.
 */
export class AdaptiveNoiseReduction {
  private readonly filterLength = 32;
  private readonly delayLength = 8;
  private weights: Float32Array;
  private buffer: Float32Array;
  private bufIndex = 0;
  private mu = 0.015; // Convergence step size
  private leak = 0.9998;
  public enabled = false;

  constructor() {
    this.weights = new Float32Array(this.filterLength);
    this.buffer = new Float32Array(this.filterLength + this.delayLength);
  }

  setLevel(level: number): void {
    // level: 1 to 10
    const norm = Math.max(1, Math.min(10, level)) / 10;
    this.mu = 0.005 + norm * 0.035;
    this.leak = 1.0 - norm * 0.0008;
  }

  reset(): void {
    this.weights.fill(0);
    this.buffer.fill(0);
    this.bufIndex = 0;
  }

  process(x: number): number {
    if (!this.enabled) return x;

    const totalBuf = this.buffer.length;
    this.buffer[this.bufIndex] = x;

    // Convolve delayed input with weights to predict correlated signal
    let y = 0;
    let power = 1e-6;
    for (let k = 0; k < this.filterLength; k++) {
      const idx = (this.bufIndex - this.delayLength - k + totalBuf) % totalBuf;
      const xDelayed = this.buffer[idx];
      y += this.weights[k] * xDelayed;
      power += xDelayed * xDelayed;
    }

    // Error calculation: difference between current sample and predicted periodic signal
    const err = x - y;
    const normalizedMu = this.mu / power;

    // Weight update (NLMS with leakage)
    for (let k = 0; k < this.filterLength; k++) {
      const idx = (this.bufIndex - this.delayLength - k + totalBuf) % totalBuf;
      const xDelayed = this.buffer[idx];
      this.weights[k] = this.weights[k] * this.leak + normalizedMu * err * xDelayed;
    }

    this.bufIndex = (this.bufIndex + 1) % totalBuf;

    // Output the cleaned, enhanced signal (y) blended with slight residual
    return 0.85 * y + 0.15 * x;
  }
}

export class DeEmphasisFilter {
  private alpha: number = 0;
  private prevY: number = 0;

  constructor(sampleRate: number, tauSeconds: number = 50e-6) {
    this.configure(sampleRate, tauSeconds);
  }

  configure(sampleRate: number, tauSeconds: number = 50e-6): void {
    const dt = 1 / sampleRate;
    this.alpha = dt / (dt + tauSeconds);
  }

  process(x: number): number {
    this.prevY += this.alpha * (x - this.prevY);
    return this.prevY;
  }

  reset(): void {
    this.prevY = 0;
  }
}

export class AudioAgc {
  private gain = 1.0;
  private readonly attackCoeff = 0.05;
  private readonly decayCoeff = 0.0005;
  private readonly targetLevel = 0.35;

  process(sample: number): number {
    const absVal = Math.abs(sample);
    if (absVal * this.gain > this.targetLevel) {
      // Fast attack to prevent clipping
      this.gain -= this.attackCoeff * (this.gain - this.targetLevel / Math.max(absVal, 1e-4));
    } else {
      // Slow release/decay
      this.gain += this.decayCoeff * (this.targetLevel / Math.max(absVal, 1e-4) - this.gain);
    }
    this.gain = Math.max(0.01, Math.min(this.gain, 25.0));
    return Math.max(-1.0, Math.min(1.0, sample * this.gain));
  }
}

export class Demodulator {
  private prevI = 0;
  private prevQ = 0;
  private amDc = 0;
  private bfoPhase = 0;
  private readonly deEmphasis: DeEmphasisFilter;
  private readonly audioLowpass: BiquadFilter;
  private readonly cwBandpass: BiquadFilter;
  private readonly agc: AudioAgc;

  // Advanced Digital Filters
  public readonly anr: AdaptiveNoiseReduction;
  public readonly notchFilter: BiquadFilter;
  public readonly bandpassFilter: BiquadFilter;
  public readonly rumbleHighpass: BiquadFilter;

  public notchEnabled = false;
  public rumbleEnabled = false;

  constructor(audioSampleRate: number = 48000) {
    this.deEmphasis = new DeEmphasisFilter(audioSampleRate, 50e-6);
    this.audioLowpass = new BiquadFilter();
    this.audioLowpass.setLowpass(audioSampleRate, 15000);
    this.cwBandpass = new BiquadFilter();
    this.cwBandpass.setBandpass(audioSampleRate, 700, 300);
    this.agc = new AudioAgc();

    // Advanced filters
    this.anr = new AdaptiveNoiseReduction();
    this.notchFilter = new BiquadFilter();
    this.notchFilter.setNotch(audioSampleRate, 1000, 15);
    this.bandpassFilter = new BiquadFilter();
    this.bandpassFilter.setBandpassQ(audioSampleRate, 1500, 1.2);
    this.rumbleHighpass = new BiquadFilter();
    this.rumbleHighpass.setHighpass(audioSampleRate, 80, 0.707); // 80 Hz wireless mic rumble cut
  }

  configureNotch(sampleRate: number, notchFreqHz: number, q: number): void {
    this.notchFilter.setNotch(sampleRate, notchFreqHz, q);
  }

  configureBandpass(sampleRate: number, centerHz: number, q: number): void {
    this.bandpassFilter.setBandpassQ(sampleRate, centerHz, q);
  }

  reset(): void {
    this.prevI = 0;
    this.prevQ = 0;
    this.amDc = 0;
    this.bfoPhase = 0;
    this.deEmphasis.reset();
    this.audioLowpass.reset();
    this.cwBandpass.reset();
    this.anr.reset();
    this.notchFilter.reset();
    this.bandpassFilter.reset();
    this.rumbleHighpass.reset();
  }

  /**
   * Demodulates a single complex IQ pair into an audio sample [-1.0, 1.0].
   */
  demodulateSample(
    i: number,
    q: number,
    mode: DemodulationMode,
    enableAgc: boolean = true
  ): number {
    let audio = 0;

    switch (mode) {
      case 'WFM': {
        // Polar discriminator (instantaneous phase derivative)
        const num = i * this.prevQ - q * this.prevI;
        const den = i * this.prevI + q * this.prevQ;
        const dPhase = Math.atan2(num, den);
        this.prevI = i;
        this.prevQ = q;

        // Apply FM de-emphasis (50µs)
        const deemphasized = this.deEmphasis.process(dPhase / Math.PI);
        audio = this.audioLowpass.process(deemphasized);
        break;
      }

      case 'NFM': {
        // Narrowband FM
        const num = i * this.prevQ - q * this.prevI;
        const den = i * this.prevI + q * this.prevQ;
        const dPhase = Math.atan2(num, den);
        this.prevI = i;
        this.prevQ = q;
        audio = Math.max(-1, Math.min(1, (dPhase / Math.PI) * 2.5));
        break;
      }

      case 'AM': {
        // Envelope detection: sqrt(I^2 + Q^2)
        const envelope = Math.hypot(i, q);
        // DC offset blocker
        this.amDc = 0.995 * this.amDc + 0.005 * envelope;
        audio = (envelope - this.amDc) * 2.0;
        break;
      }

      case 'USB': {
        // Upper Sideband demodulation: I + Q (approximate baseband sideband)
        audio = (i + q) * 1.5;
        break;
      }

      case 'LSB': {
        // Lower Sideband demodulation: I - Q
        audio = (i - q) * 1.5;
        break;
      }

      case 'CW': {
        // Continuous Wave (Morse): Heterodyne with BFO (700 Hz)
        this.bfoPhase += (2 * Math.PI * 700) / 48000;
        if (this.bfoPhase > 2 * Math.PI) this.bfoPhase -= 2 * Math.PI;

        const bfoI = Math.cos(this.bfoPhase);
        const bfoQ = Math.sin(this.bfoPhase);
        // Mix to 700 Hz audio tone
        const mixed = i * bfoI - q * bfoQ;
        audio = this.cwBandpass.process(mixed) * 2.5;
        break;
      }
    }

    // Apply Configurable Notch Filter if enabled
    if (this.notchEnabled) {
      audio = this.notchFilter.process(audio);
    }

    // Apply Wireless Mic Rumble Filter (80 Hz cut) if enabled
    if (this.rumbleEnabled) {
      audio = this.rumbleHighpass.process(audio);
    }

    // Apply Adaptive Noise Reduction (ANR) if enabled
    if (this.anr.enabled) {
      audio = this.anr.process(audio);
    }

    if (enableAgc) {
      audio = this.agc.process(audio);
    }

    return Math.max(-1.0, Math.min(1.0, audio));
  }
}
