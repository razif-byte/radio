import { DemodulationMode } from '../types.js';

/**
 * High-performance audio filters, AGC, and Demodulators for SDR IQ streams.
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
    const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (1 - cosw0) / 2 / a0;
    this.b1 = (1 - cosw0) / a0;
    this.b2 = (1 - cosw0) / 2 / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setBandpass(sampleRate: number, centerHz: number, bandwidthHz: number): void {
    const w0 = (2 * Math.PI * centerHz) / sampleRate;
    const q = centerHz / bandwidthHz;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (alpha) / a0;
    this.b1 = 0;
    this.b2 = (-alpha) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  reset(): void {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
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

  constructor(audioSampleRate: number = 48000) {
    this.deEmphasis = new DeEmphasisFilter(audioSampleRate, 50e-6);
    this.audioLowpass = new BiquadFilter();
    this.audioLowpass.setLowpass(audioSampleRate, 15000);
    this.cwBandpass = new BiquadFilter();
    this.cwBandpass.setBandpass(audioSampleRate, 700, 300);
    this.agc = new AudioAgc();
  }

  reset(): void {
    this.prevI = 0;
    this.prevQ = 0;
    this.amDc = 0;
    this.bfoPhase = 0;
    this.deEmphasis.reset();
    this.audioLowpass.reset();
    this.cwBandpass.reset();
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
        // dPhase = atan2(I*Qprev - Q*Iprev, I*Iprev + Q*Qprev)
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

    if (enableAgc) {
      audio = this.agc.process(audio);
    }

    return Math.max(-1.0, Math.min(1.0, audio));
  }
}
