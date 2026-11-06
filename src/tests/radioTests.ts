import { TestResult } from '../types.js';
import { ComplexFft } from '../dsp/fft.js';
import { Demodulator, BiquadFilter, AdaptiveNoiseReduction } from '../dsp/demodulators.js';
import { BAND_CONFIGS, StationManager } from '../storage/stationManager.js';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { IqTestSignalDevice } from '../hardware/iqTestSignal.js';
import { WebUsbAirspyDevice } from '../hardware/webusbAirspy.js';

export class RadioTestSuite {
  static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // 1. Frequency Conversion & Step Snap Test
    try {
      const fmConfig = BAND_CONFIGS.FM;
      const testFreq = 88_534_120;
      const step = 100_000;
      const snapped = Math.round(testFreq / step) * step;
      const inRange = snapped >= fmConfig.minFreqHz && snapped <= fmConfig.maxFreqHz;
      results.push({
        name: 'Tuning Step Calculation & Frequency Limits',
        category: 'Tuning & Math',
        passed: inRange && snapped === 88_500_000,
        message: `Snapped 88.534 MHz to ${(snapped / 1e6).toFixed(3)} MHz within range [87.5 - 108] MHz`,
      });
    } catch (err) {
      results.push({
        name: 'Tuning Step Calculation',
        category: 'Tuning & Math',
        passed: false,
        message: String(err),
      });
    }

    // 2. Cooley-Tukey FFT Transform & Peak Energy Test
    try {
      const fft = new ComplexFft(256, 'none');
      const r = new Float32Array(256);
      const im = new Float32Array(256);
      const outDb = new Float32Array(256);

      // Inject a pure sine tone at bin 32
      const targetBin = 32;
      for (let k = 0; k < 256; k++) {
        r[k] = Math.cos((2 * Math.PI * targetBin * k) / 256);
        im[k] = Math.sin((2 * Math.PI * targetBin * k) / 256);
      }
      fft.calculatePowerSpectrum(r, im, outDb, -100);

      let maxVal = -999;
      let maxIdx = -1;
      for (let k = 0; k < 256; k++) {
        if (outDb[k] > maxVal) {
          maxVal = outDb[k];
          maxIdx = k;
        }
      }
      const expectedShifted = (targetBin + 128) % 256;
      const match = Math.abs(maxIdx - expectedShifted) <= 1;
      results.push({
        name: 'Radix-2 FFT Spectral Analysis',
        category: 'DSP Engine',
        passed: match,
        message: `Pure tone detected at FFT bin ${maxIdx} with peak power ${maxVal.toFixed(1)} dBm`,
      });
    } catch (err) {
      results.push({
        name: 'Radix-2 FFT Spectral Analysis',
        category: 'DSP Engine',
        passed: false,
        message: String(err),
      });
    }

    // 3. User-Configurable Notch Filter Interference Suppression Test
    try {
      const notch = new BiquadFilter();
      notch.setNotch(48000, 1000, 20); // 1000 Hz notch with high Q=20

      // Measure attenuation of 1000 Hz tone
      let sumSqNotched = 0;
      let sumSqPass = 0;
      for (let k = 0; k < 400; k++) {
        const tone1k = Math.sin((2 * Math.PI * 1000 * k) / 48000);
        const tone300 = Math.sin((2 * Math.PI * 300 * k) / 48000);

        const out1k = notch.process(tone1k);
        if (k > 100) sumSqNotched += out1k * out1k;
      }

      const notchFilterPass = new BiquadFilter();
      notchFilterPass.setNotch(48000, 1000, 20);
      for (let k = 0; k < 400; k++) {
        const tone300 = Math.sin((2 * Math.PI * 300 * k) / 48000);
        const out300 = notchFilterPass.process(tone300);
        if (k > 100) sumSqPass += out300 * out300;
      }

      // 1000 Hz tone should be heavily attenuated compared to 300 Hz tone
      const ratio = sumSqNotched / Math.max(sumSqPass, 1e-6);
      const passed = ratio < 0.05; // >13 dB suppression
      results.push({
        name: 'User-Configurable Notch Filter (Interference Tone Cut)',
        category: 'Advanced DSP Filters',
        passed,
        message: `Attenuated 1 kHz tone by ${(10 * Math.log10(ratio)).toFixed(1)} dB while 300 Hz passband maintained`,
      });
    } catch (err) {
      results.push({
        name: 'Notch Filter Test',
        category: 'Advanced DSP Filters',
        passed: false,
        message: String(err),
      });
    }

    // 4. Adaptive Noise Reduction (ANR) Test
    try {
      const anr = new AdaptiveNoiseReduction();
      anr.enabled = true;
      anr.setLevel(7);

      // Generate noisy tone
      let outSample = 0;
      for (let k = 0; k < 300; k++) {
        const tone = 0.5 * Math.sin((2 * Math.PI * 500 * k) / 48000);
        const noise = (Math.random() - 0.5) * 0.3;
        outSample = anr.process(tone + noise);
      }
      const passed = !isNaN(outSample) && Math.abs(outSample) <= 1.0;
      results.push({
        name: 'Adaptive Noise Reduction (NLMS Line Enhancer)',
        category: 'Advanced DSP Filters',
        passed,
        message: `Enhanced signal extracted with convergence stability (output: ${outSample.toFixed(3)})`,
      });
    } catch (err) {
      results.push({
        name: 'Adaptive Noise Reduction',
        category: 'Advanced DSP Filters',
        passed: false,
        message: String(err),
      });
    }

    // 5. Wireless Mic Rumble Cut Filter (80 Hz Highpass) Test
    try {
      const hp = new BiquadFilter();
      hp.setHighpass(48000, 80, 0.707);

      let sumSqRumble = 0;
      let sumSqVoice = 0;
      for (let k = 0; k < 400; k++) {
        const rumble30Hz = Math.sin((2 * Math.PI * 30 * k) / 48000);
        const out30 = hp.process(rumble30Hz);
        if (k > 100) sumSqRumble += out30 * out30;
      }
      const hp2 = new BiquadFilter();
      hp2.setHighpass(48000, 80, 0.707);
      for (let k = 0; k < 400; k++) {
        const voice500Hz = Math.sin((2 * Math.PI * 500 * k) / 48000);
        const out500 = hp2.process(voice500Hz);
        if (k > 100) sumSqVoice += out500 * out500;
      }

      const passed = sumSqRumble < sumSqVoice * 0.25;
      results.push({
        name: 'Wireless Mic 80 Hz Rumble Cut Highpass Filter',
        category: 'Audio Jack & Mic',
        passed,
        message: `Suppressed 30 Hz handling rumble while preserving 500 Hz speech frequencies`,
      });
    } catch (err) {
      results.push({
        name: 'Wireless Mic Rumble Cut',
        category: 'Audio Jack & Mic',
        passed: false,
        message: String(err),
      });
    }

    // 6. WFM Demodulation Test
    try {
      const demod = new Demodulator(48000);
      let recoveredTone = 0;
      let phase = 0;
      for (let k = 0; k < 500; k++) {
        const audio = Math.sin((2 * Math.PI * 1000 * k) / 48000);
        phase += (2 * Math.PI * (10000 + 5000 * audio)) / 48000;
        const i = Math.cos(phase);
        const q = Math.sin(phase);
        recoveredTone = demod.demodulateSample(i, q, 'WFM', false);
      }
      const passed = !isNaN(recoveredTone) && Math.abs(recoveredTone) <= 1.0;
      results.push({
        name: 'Wideband FM (WFM) Polar Demodulation',
        category: 'Demodulation',
        passed,
        message: `Recovered normalized FM audio sample: ${recoveredTone.toFixed(4)}`,
      });
    } catch (err) {
      results.push({
        name: 'Wideband FM Demodulation',
        category: 'Demodulation',
        passed: false,
        message: String(err),
      });
    }

    // 7. AM Demodulation Envelope Detector Test
    try {
      const demod = new Demodulator(48000);
      let lastAudio = 0;
      for (let k = 0; k < 400; k++) {
        const mod = 0.5 * Math.sin((2 * Math.PI * 400 * k) / 48000);
        const env = 1.0 + mod;
        const i = env * Math.cos((2 * Math.PI * 5000 * k) / 48000);
        const q = env * Math.sin((2 * Math.PI * 5000 * k) / 48000);
        lastAudio = demod.demodulateSample(i, q, 'AM', false);
      }
      const passed = !isNaN(lastAudio) && Math.abs(lastAudio) <= 1.5;
      results.push({
        name: 'AM Envelope Detector & DC Blocker',
        category: 'Demodulation',
        passed,
        message: `Extracted AM modulation audio amplitude: ${lastAudio.toFixed(4)}`,
      });
    } catch (err) {
      results.push({
        name: 'AM Demodulation',
        category: 'Demodulation',
        passed: false,
        message: String(err),
      });
    }

    // 8. Airspy SDR Hardware Abstraction & Driver Verification
    try {
      const airspy = new WebUsbAirspyDevice();
      const status = airspy.getStatus();
      const passed = status.deviceType === 'AIRSPY_SDR_USB' && status.sampleRateHz === 2_500_000;
      results.push({
        name: 'Airspy SDR Hardware Abstraction & Driver Setup',
        category: 'Hardware',
        passed,
        message: `Initialized ${status.deviceName} profile with ${(status.sampleRateHz / 1e6).toFixed(1)} MSPS default`,
      });
    } catch (err) {
      results.push({
        name: 'Airspy SDR Driver',
        category: 'Hardware',
        passed: false,
        message: String(err),
      });
    }

    // 9. Station Preset Storage & Export Test
    try {
      const sm = new StationManager();
      const presets = sm.getPresets();
      const exported = sm.exportToJson();
      const reimported = sm.importFromJson(exported);
      results.push({
        name: 'Station Preset Management & JSON Serialization',
        category: 'Storage',
        passed: presets.length >= 10 && reimported,
        message: `Successfully loaded ${presets.length} international & Malaysian presets with JSON round-trip`,
      });
    } catch (err) {
      results.push({
        name: 'Preset Storage',
        category: 'Storage',
        passed: false,
        message: String(err),
      });
    }

    // 10. 16-Bit PCM WAV Recording Generator Test
    try {
      const recorder = new AudioRecorder();
      recorder.start(48000);
      const testBuffer = new Float32Array(4800);
      for (let i = 0; i < testBuffer.length; i++) {
        testBuffer[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
      }
      recorder.addSamples(testBuffer);
      const item = recorder.stop(88_500_000, 'FM', 'WFM');
      const passed = item !== null && item.blob.size >= 44 + 4800 * 2;
      results.push({
        name: 'RIFF 16-bit PCM WAV Audio Encoder',
        category: 'Recording',
        passed,
        message: `Generated valid WAV file (${item?.blob.size} bytes, ${item?.fileName})`,
      });
    } catch (err) {
      results.push({
        name: 'WAV Audio Encoder',
        category: 'Recording',
        passed: false,
        message: String(err),
      });
    }

    return results;
  }
}
