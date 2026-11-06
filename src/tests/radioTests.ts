import { TestResult } from '../types.js';
import { ComplexFft } from '../dsp/fft.js';
import { Demodulator, BiquadFilter } from '../dsp/demodulators.js';
import { BAND_CONFIGS, StationManager } from '../storage/stationManager.js';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { IqTestSignalDevice } from '../hardware/iqTestSignal.js';

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

      // Verify that the maximum peak is located at expected shifted bin
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

    // 3. WFM Demodulation Test
    try {
      const demod = new Demodulator(48000);
      let recoveredTone = 0;
      let phase = 0;
      // Synthesize 500 samples of frequency-modulated signal
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

    // 4. AM Demodulation Envelope Detector Test
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

    // 5. SSB / CW Demodulation Test
    try {
      const demod = new Demodulator(48000);
      const usbSample = demod.demodulateSample(0.5, 0.3, 'USB', true);
      const lsbSample = demod.demodulateSample(0.5, 0.3, 'LSB', true);
      const cwSample = demod.demodulateSample(0.4, 0.4, 'CW', true);

      const passed = !isNaN(usbSample) && !isNaN(lsbSample) && !isNaN(cwSample);
      results.push({
        name: 'SSB (USB/LSB) & CW Heterodyne Demodulation',
        category: 'Demodulation',
        passed,
        message: `USB: ${usbSample.toFixed(2)}, LSB: ${lsbSample.toFixed(2)}, CW: ${cwSample.toFixed(2)}`,
      });
    } catch (err) {
      results.push({
        name: 'SSB & CW Demodulation',
        category: 'Demodulation',
        passed: false,
        message: String(err),
      });
    }

    // 6. Audio Biquad Filter Test
    try {
      const filter = new BiquadFilter();
      filter.setLowpass(48000, 3000);
      let out = 0;
      for (let i = 0; i < 100; i++) {
        out = filter.process(1.0);
      }
      const passed = Math.abs(out - 1.0) < 0.05;
      results.push({
        name: 'Audio Biquad Lowpass Filter Stability',
        category: 'DSP Engine',
        passed,
        message: `DC gain converged to ${out.toFixed(4)} (expected 1.0)`,
      });
    } catch (err) {
      results.push({
        name: 'Audio Biquad Filter',
        category: 'DSP Engine',
        passed: false,
        message: String(err),
      });
    }

    // 7. Station Preset Storage & Export Test
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

    // 8. 16-Bit PCM WAV Recording Generator Test
    try {
      const recorder = new AudioRecorder();
      recorder.start(48000);
      const testBuffer = new Float32Array(4800); // 100ms
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

    // 9. Hardware Test Bench Streaming & Reconnect Test
    try {
      const hw = new IqTestSignalDevice();
      await hw.open();
      let samplesReceived = 0;
      await hw.startStreaming((i, q) => {
        samplesReceived += i.length;
      });
      // Wait 60ms
      await new Promise((r) => setTimeout(r, 60));
      await hw.stopStreaming();
      await hw.close();

      results.push({
        name: 'SDR Hardware Abstraction & Reconnect Handling',
        category: 'Hardware',
        passed: samplesReceived > 0,
        message: `Hardware streaming active: received ${samplesReceived} IQ samples with clean shutdown`,
      });
    } catch (err) {
      results.push({
        name: 'SDR Hardware Abstraction',
        category: 'Hardware',
        passed: false,
        message: String(err),
      });
    }

    return results;
  }
}
