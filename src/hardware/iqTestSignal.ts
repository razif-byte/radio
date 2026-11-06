import { ISdrDevice, IqSampleCallback } from './sdrInterface.js';
import { HardwareStatus, HardwareDeviceType } from '../types.js';

interface SimulatedStation {
  freqHz: number;
  type: 'WFM' | 'AM' | 'CW' | 'SSB';
  name: string;
  powerDbm: number; // e.g. -65 dBm
}

export class IqTestSignalDevice implements ISdrDevice {
  readonly deviceType: HardwareDeviceType = 'IQ_TEST_BENCH';
  readonly name: string = 'Bangku Ujian Isyarat IQ / IQ Test Bench';

  private connected = true;
  private streaming = false;
  private sampleCallback: IqSampleCallback | null = null;
  private timerId: number | null = null;

  private centerFreqHz = 88_500_000;
  private sampleRateHz = 1_024_000;
  private gainDb = 32.0;
  private autoGain = true;
  private ppmCorrection = 0;

  private phaseAccumulator = 0;
  private audioPhase = 0;
  private morseTime = 0;

  // Known stations in the test RF band
  private stations: SimulatedStation[] = [
    // FM Broadcast stations
    { freqHz: 87_700_000, type: 'WFM', name: 'Radio Klasik', powerDbm: -62 },
    { freqHz: 88_500_000, type: 'WFM', name: 'Nasional FM', powerDbm: -55 },
    { freqHz: 89_300_000, type: 'WFM', name: 'Ai FM', powerDbm: -68 },
    { freqHz: 92_900_000, type: 'WFM', name: 'Hitz FM', powerDbm: -58 },
    { freqHz: 95_800_000, type: 'WFM', name: 'Fly FM', powerDbm: -64 },
    { freqHz: 96_700_000, type: 'WFM', name: 'Sinar FM', powerDbm: -60 },
    { freqHz: 105_700_000, type: 'WFM', name: 'Lite FM', powerDbm: -66 },
    // AM Broadcast stations
    { freqHz: 576_000, type: 'AM', name: 'RTM MW 576 kHz', powerDbm: -58 },
    { freqHz: 684_000, type: 'AM', name: 'RTM MW 684 kHz', powerDbm: -62 },
    { freqHz: 1000_000, type: 'AM', name: 'Standard AM 1 MHz', powerDbm: -70 },
    // Shortwave & Amateur Radio
    { freqHz: 7_030_000, type: 'CW', name: 'HAM 40m CW Beacon', powerDbm: -75 },
    { freqHz: 7_100_000, type: 'SSB', name: 'HAM 40m LSB Net', powerDbm: -72 },
    { freqHz: 11_835_000, type: 'AM', name: 'BBC World Service SW', powerDbm: -68 },
    { freqHz: 14_200_000, type: 'SSB', name: 'HAM 20m USB Calling', powerDbm: -74 },
    { freqHz: 15_400_000, type: 'AM', name: 'Voice of America SW', powerDbm: -70 },
  ];

  get isConnected(): boolean {
    return this.connected;
  }

  get isStreaming(): boolean {
    return this.streaming;
  }

  async open(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async close(): Promise<void> {
    await this.stopStreaming();
    this.connected = false;
  }

  async startStreaming(callback: IqSampleCallback): Promise<void> {
    this.sampleCallback = callback;
    this.streaming = true;

    // Generate ~2048 samples every 20ms (~102.4k complex SPS delivery rate)
    const chunkSize = 2048;
    const intervalMs = 20;
    const iBuf = new Float32Array(chunkSize);
    const qBuf = new Float32Array(chunkSize);

    this.timerId = window.setInterval(() => {
      if (!this.streaming || !this.sampleCallback) return;
      this.synthesizeIqChunk(iBuf, qBuf, chunkSize);
      this.sampleCallback(iBuf, qBuf, this.sampleRateHz);
    }, intervalMs);
  }

  async stopStreaming(): Promise<void> {
    this.streaming = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.sampleCallback = null;
  }

  async setCenterFrequency(frequencyHz: number): Promise<void> {
    this.centerFreqHz = frequencyHz;
  }

  async setSampleRate(sampleRateHz: number): Promise<void> {
    this.sampleRateHz = sampleRateHz;
  }

  async setTunerGain(gainDb: number, autoGain: boolean): Promise<void> {
    this.gainDb = gainDb;
    this.autoGain = autoGain;
  }

  async setPpmCorrection(ppm: number): Promise<void> {
    this.ppmCorrection = ppm;
  }

  private synthesizeIqChunk(iBuf: Float32Array, qBuf: Float32Array, len: number): void {
    const fs = this.sampleRateHz;
    const halfSpan = fs / 2;
    const center = this.centerFreqHz;

    // Find stations within the receiver's visible IQ passband [center - fs/2, center + fs/2]
    const inBandStations = this.stations.filter(
      (st) => Math.abs(st.freqHz - center) <= halfSpan
    );

    // Realistic Gaussian noise floor: standard deviation ≈ 0.02 (-95 dBm)
    const noiseStd = 0.02;

    for (let k = 0; k < len; k++) {
      // Box-Muller transform for Gaussian noise
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.random();
      const mag = noiseStd * Math.sqrt(-2.0 * Math.log(u1));
      let iVal = mag * Math.cos(2.0 * Math.PI * u2);
      let qVal = mag * Math.sin(2.0 * Math.PI * u2);

      // Add each in-band RF carrier
      for (const st of inBandStations) {
        const offsetHz = st.freqHz - center;
        const omegaOffset = (2 * Math.PI * offsetHz) / fs;

        // Amplitude based on station power: e.g. -60 dBm -> 0.35 amp
        const rawAmp = Math.pow(10, (st.powerDbm + 70) / 20) * 0.3;
        const amp = Math.max(0.01, Math.min(1.0, rawAmp));

        // Advance modulation
        this.audioPhase += (2 * Math.PI * 440) / fs;
        if (this.audioPhase > 2 * Math.PI) this.audioPhase -= 2 * Math.PI;

        this.morseTime += 1 / fs;

        let modI = 0;
        let modQ = 0;

        if (st.type === 'WFM') {
          // FM modulation: frequency deviation proportional to audio
          // 440 Hz + 880 Hz harmonic broadcast audio tone
          const audio = 0.6 * Math.sin(this.audioPhase) + 0.4 * Math.sin(this.audioPhase * 2);
          const freqDev = 75000 * audio; // 75 kHz max FM deviation
          this.phaseAccumulator += (2 * Math.PI * (offsetHz + freqDev)) / fs;
          if (this.phaseAccumulator > 2 * Math.PI) this.phaseAccumulator -= 2 * Math.PI;

          modI = amp * Math.cos(this.phaseAccumulator);
          modQ = amp * Math.sin(this.phaseAccumulator);
        } else if (st.type === 'AM') {
          // AM modulation: (1 + m*sin(w_audio*t)) * carrier
          const audio = 0.7 * Math.sin(this.audioPhase);
          const carrierPhase = (2 * Math.PI * offsetHz * k) / fs;
          const amEnv = amp * (1.0 + audio);
          modI = amEnv * Math.cos(carrierPhase);
          modQ = amEnv * Math.sin(carrierPhase);
        } else if (st.type === 'CW') {
          // Morse code beeping: 3 dits, 3 dahs, 3 dits (SOS)
          const cycle = this.morseTime % 4.0;
          const isDit = (cycle >= 0.2 && cycle <= 0.4) || (cycle >= 0.6 && cycle <= 0.8) || (cycle >= 1.0 && cycle <= 1.2);
          const isDah = (cycle >= 1.6 && cycle <= 2.2) || (cycle >= 2.4 && cycle <= 3.0) || (cycle >= 3.2 && cycle <= 3.8);
          const keyOn = isDit || isDah;

          if (keyOn) {
            const carrierPhase = (2 * Math.PI * offsetHz * k) / fs;
            modI = amp * Math.cos(carrierPhase);
            modQ = amp * Math.sin(carrierPhase);
          }
        } else {
          // SSB
          const audio = Math.sin(this.audioPhase);
          const carrierPhase = (2 * Math.PI * offsetHz * k) / fs;
          modI = amp * audio * Math.cos(carrierPhase);
          modQ = amp * audio * Math.sin(carrierPhase);
        }

        iVal += modI;
        qVal += modQ;
      }

      iBuf[k] = Math.max(-1.0, Math.min(1.0, iVal));
      qBuf[k] = Math.max(-1.0, Math.min(1.0, qVal));
    }
  }

  getStatus(): HardwareStatus {
    return {
      connected: this.connected,
      deviceType: this.deviceType,
      deviceName: this.name,
      sampleRateHz: this.sampleRateHz,
      tunerGainDb: this.gainDb,
      rfGainAuto: this.autoGain,
      ppmCorrection: this.ppmCorrection,
      isStreaming: this.streaming,
    };
  }
}
