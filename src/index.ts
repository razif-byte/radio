import * as xb from 'xrblocks';
import { ReceiverState, RadioBand, DemodulationMode, HardwareDeviceType } from './types.js';
import { BAND_CONFIGS, StationManager } from './storage/stationManager.js';
import { DspEngine } from './dsp/dspEngine.js';
import { SpectrumRenderer } from './ui/spectrumCanvas.js';
import { AudioRecorder } from './audio/audioRecorder.js';
import { ISdrDevice } from './hardware/sdrInterface.js';
import { IqTestSignalDevice } from './hardware/iqTestSignal.js';
import { WebUsbRtlSdrDevice } from './hardware/webusbRtlSdr.js';
import { AudioJackDevice } from './hardware/audioJack.js';
import { SpatialRadioScene } from './ui/spatialRadioScene.js';
import { DesktopOverlay } from './ui/desktopOverlay.js';

class SmartRadioTunerApp extends xb.Script {
  private state: ReceiverState;
  private dspEngine: DspEngine;
  private spectrumRenderer: SpectrumRenderer;
  private stationManager: StationManager;
  private recorder: AudioRecorder;

  // Hardware Devices
  private testBenchDevice: IqTestSignalDevice;
  private webUsbDevice: WebUsbRtlSdrDevice;
  private audioJackDevice: AudioJackDevice;
  private activeDevice: ISdrDevice;

  // UI Components
  private spatialScene!: SpatialRadioScene;
  private desktopOverlay!: DesktopOverlay;

  // Scanning state
  private scanTimer = 0;

  constructor() {
    super();

    // Default configuration: FM Band, 88.5 MHz (Nasional FM), Bahasa Melayu
    this.state = {
      frequencyHz: 88_500_000,
      band: 'FM',
      mode: 'WFM',
      stepHz: 100_000,
      bandwidthHz: 200_000,
      volume: 0.8,
      muted: false,
      squelchDb: -80,
      squelchOpen: true,
      rfGainDb: 32.0,
      rfGainAuto: true,
      agcEnabled: true,
      noiseBlanker: false,
      stereoMode: true,
      audioFilterLowHz: 50,
      audioFilterHighHz: 15_000,
      signalStrengthDbm: -105,
      snrDb: 0,
      sMeterValue: 0,
      isPlaying: false,
      isScanning: false,
      isRecording: false,
      recordingSeconds: 0,
      language: 'ms', // Default Bahasa Melayu as specified
    };

    // Instantiate core modules
    this.dspEngine = new DspEngine();
    this.spectrumRenderer = new SpectrumRenderer(640, 180, 140);
    this.stationManager = new StationManager();
    this.recorder = new AudioRecorder();

    // Hardware devices
    this.testBenchDevice = new IqTestSignalDevice();
    this.webUsbDevice = new WebUsbRtlSdrDevice();
    this.audioJackDevice = new AudioJackDevice();
    this.activeDevice = this.testBenchDevice;

    // Connect audio recorder tap
    this.dspEngine.onAudioSampleCallback = (sample) => {
      if (this.state.isRecording) {
        this.recorder.addSamples(new Float32Array([sample]));
      }
    };
  }

  async init() {
    // 1. Build and mount 3D Spatial Radio Scene
    this.spatialScene = new SpatialRadioScene(
      this.state,
      this.spectrumRenderer,
      {
        onTune: (delta) => this.tuneBy(delta),
        onPlayToggle: () => void this.togglePlay(),
        onScanToggle: () => this.toggleScan(),
        onModeSelect: (mode) => this.setMode(mode),
        onBandSelect: (band) => this.setBand(band),
      }
    );
    this.add(this.spatialScene);

    // 2. Build and mount 2D Desktop Overlay
    this.desktopOverlay = new DesktopOverlay(
      this.state,
      this.activeDevice.getStatus(),
      this.spectrumRenderer,
      this.stationManager,
      this.recorder,
      {
        onTune: (delta) => this.tuneBy(delta),
        onSetFrequency: (freq) => this.setFrequency(freq),
        onBandSelect: (band) => this.setBand(band),
        onModeSelect: (mode) => this.setMode(mode),
        onStepSelect: (step) => this.setStep(step),
        onBandwidthSelect: (bw) => this.setBandwidth(bw),
        onVolumeChange: (vol) => this.setVolume(vol),
        onMuteToggle: () => this.toggleMute(),
        onSquelchChange: (db) => this.setSquelch(db),
        onRfGainChange: (gain, auto) => this.setRfGain(gain, auto),
        onAgcToggle: () => this.toggleAgc(),
        onPlayToggle: () => void this.togglePlay(),
        onSeek: (dir) => this.seekStation(dir),
        onScanToggle: () => this.toggleScan(),
        onRecordToggle: () => this.toggleRecord(),
        onSavePreset: () => this.saveCurrentPreset(),
        onLanguageToggle: () => this.toggleLanguage(),
        onConnectRtlSdr: () => void this.connectRtlSdrWebUsb(),
        onConnectLineIn: () => void this.connectAnalogLineIn(),
        onUseTestBench: () => void this.useTestBench(),
      }
    );

    // Initial setup for active device
    await this.activeDevice.open();
    await this.activeDevice.setCenterFrequency(this.state.frequencyHz);

    // Auto-start streaming to provide instant audio & signal responsiveness
    await this.startStream();
  }

  update() {
    super.update();

    // 1. Render spectrum and waterfall frame
    const spectrum = this.dspEngine.getSmoothedSpectrum();
    const spanHz = this.activeDevice.getStatus().sampleRateHz;
    this.spectrumRenderer.renderFrame(
      spectrum,
      this.state.frequencyHz,
      spanHz,
      this.state.squelchDb
    );

    // 2. Fetch signal metrics from DSP
    const metrics = this.dspEngine.getSignalMetrics();
    this.state.signalStrengthDbm = metrics.powerDbm;
    this.state.snrDb = metrics.snrDb;
    this.state.sMeterValue = metrics.sMeter;
    this.state.squelchOpen = metrics.squelchOpen;

    if (this.state.isRecording) {
      this.state.recordingSeconds = this.recorder.durationSeconds;
    }

    // 3. Auto-scanning step logic
    if (this.state.isScanning) {
      this.scanTimer += 1;
      if (this.scanTimer >= 18) {
        // Step every ~300ms
        this.scanTimer = 0;
        if (this.state.signalStrengthDbm > this.state.squelchDb + 3) {
          // Found a station! Pause on it
          console.log(`[Auto-Scan] Station detected at ${(this.state.frequencyHz / 1e6).toFixed(3)} MHz`);
          this.state.isScanning = false;
        } else {
          this.tuneBy(this.state.stepHz);
        }
      }
    }

    // 4. Update UIs
    this.spatialScene.updateState(this.state);
    this.desktopOverlay.updateState(this.state, this.activeDevice.getStatus());
  }

  async startStream(): Promise<void> {
    try {
      await this.dspEngine.startAudio();
      await this.activeDevice.startStreaming((iBuf, qBuf, sampleRate) => {
        this.dspEngine.processIqBatch(iBuf, qBuf, sampleRate);
      });
      this.state.isPlaying = true;
    } catch (err) {
      console.error('[Radio] Error starting stream:', err);
    }
  }

  async stopStream(): Promise<void> {
    await this.activeDevice.stopStreaming();
    this.dspEngine.stopAudio();
    this.state.isPlaying = false;
    this.state.isScanning = false;
  }

  async togglePlay(): Promise<void> {
    if (this.state.isPlaying) {
      await this.stopStream();
    } else {
      await this.startStream();
    }
  }

  setFrequency(freqHz: number): void {
    const bandCfg = BAND_CONFIGS[this.state.band];
    const clamped = Math.max(bandCfg.minFreqHz, Math.min(bandCfg.maxFreqHz, freqHz));
    this.state.frequencyHz = clamped;
    void this.activeDevice.setCenterFrequency(clamped);
    this.desktopOverlay.renderPresets();
  }

  tuneBy(deltaHz: number): void {
    this.setFrequency(this.state.frequencyHz + deltaHz);
  }

  setBand(band: RadioBand): void {
    if (band === this.state.band) return;
    this.state.band = band;
    const cfg = BAND_CONFIGS[band];
    this.state.stepHz = cfg.defaultStepHz;
    this.state.bandwidthHz = cfg.defaultBandwidthHz;
    this.setMode(cfg.defaultMode);
    this.setFrequency(cfg.defaultFreqHz);

    if (band === 'LINE_IN') {
      void this.connectAnalogLineIn();
    }
  }

  setMode(mode: DemodulationMode): void {
    this.state.mode = mode;
    this.dspEngine.setMode(mode);
  }

  setStep(stepHz: number): void {
    this.state.stepHz = stepHz;
  }

  setBandwidth(bwHz: number): void {
    this.state.bandwidthHz = bwHz;
  }

  setVolume(vol: number): void {
    this.state.volume = vol;
    this.dspEngine.setVolume(vol);
  }

  toggleMute(): void {
    this.state.muted = !this.state.muted;
    this.dspEngine.setMuted(this.state.muted);
  }

  setSquelch(db: number): void {
    this.state.squelchDb = db;
    this.dspEngine.setSquelchDb(db);
  }

  setRfGain(gain: number, autoGain: boolean): void {
    this.state.rfGainDb = gain;
    this.state.rfGainAuto = autoGain;
    void this.activeDevice.setTunerGain(gain, autoGain);
  }

  toggleAgc(): void {
    this.state.agcEnabled = !this.state.agcEnabled;
    this.dspEngine.setAgcEnabled(this.state.agcEnabled);
  }

  seekStation(direction: 1 | -1): void {
    const step = this.state.stepHz * direction;
    this.tuneBy(step);
  }

  toggleScan(): void {
    this.state.isScanning = !this.state.isScanning;
    this.scanTimer = 0;
    if (this.state.isScanning && !this.state.isPlaying) {
      void this.startStream();
    }
  }

  toggleRecord(): void {
    if (!this.state.isRecording) {
      this.recorder.start(this.dspEngine.audioSampleRate);
      this.state.isRecording = true;
      this.state.recordingSeconds = 0;
    } else {
      const rec = this.recorder.stop(
        this.state.frequencyHz,
        this.state.band,
        this.state.mode
      );
      this.state.isRecording = false;
      this.state.recordingSeconds = 0;
      if (rec) {
        console.log(`[Recorder] Saved WAV: ${rec.fileName} (${rec.sizeBytes} bytes)`);
      }
    }
  }

  saveCurrentPreset(): void {
    const freqMhz = (this.state.frequencyHz / 1e6).toFixed(3);
    const defaultName = `${this.state.band} ${freqMhz} MHz`;
    const name = window.prompt('Masukkan nama stesen / Enter station name:', defaultName) || defaultName;

    this.stationManager.addPreset({
      name,
      frequencyHz: this.state.frequencyHz,
      band: this.state.band,
      mode: this.state.mode,
      category: this.state.band === 'FM' ? 'FM Broadcast' : this.state.band === 'AM' ? 'AM Broadcast' : 'Shortwave',
    });
    this.desktopOverlay.renderPresets();
  }

  toggleLanguage(): void {
    this.state.language = this.state.language === 'ms' ? 'en' : 'ms';
  }

  async connectRtlSdrWebUsb(): Promise<void> {
    await this.stopStream();
    const ok = await this.webUsbDevice.open();
    if (ok) {
      this.activeDevice = this.webUsbDevice;
      await this.activeDevice.setCenterFrequency(this.state.frequencyHz);
      await this.startStream();
    } else {
      alert('Peranti RTL-SDR tidak dikesan melalui WebUSB. Memastikan pemacu WinUSB dipasang atau menggunakan Bangku Ujian Isyarat IQ.');
      await this.useTestBench();
    }
  }

  async connectAnalogLineIn(): Promise<void> {
    await this.stopStream();
    const ok = await this.audioJackDevice.open();
    if (ok) {
      await this.audioJackDevice.startStreaming((samples) => {
        this.dspEngine.processAnalogAudioBatch(samples);
      });
      this.activeDevice = this.audioJackDevice as unknown as ISdrDevice;
      this.state.isPlaying = true;
    } else {
      alert('Tidak dapat mengakses input audio mikrofon/Line-In.');
      await this.useTestBench();
    }
  }

  async useTestBench(): Promise<void> {
    await this.stopStream();
    this.activeDevice = this.testBenchDevice;
    await this.activeDevice.open();
    await this.activeDevice.setCenterFrequency(this.state.frequencyHz);
    await this.startStream();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.setAppTitle('Smart Radio Tuner Professional');
  options.setAppDescription('Multi-Band SDR Radio Receiver for FM, AM, Shortwave & WebUSB RTL-SDR');

  xb.add(new SmartRadioTunerApp());
  await xb.init(options);
});
