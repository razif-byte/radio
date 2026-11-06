import { ReceiverState, RadioBand, DemodulationMode, HardwareStatus } from '../types.js';
import { translations } from '../translations.js';
import { SpectrumRenderer } from './spectrumCanvas.js';
import { BAND_CONFIGS, StationManager } from '../storage/stationManager.js';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { RadioTestSuite } from '../tests/radioTests.js';

export interface DesktopOverlayHandlers {
  onTune: (deltaHz: number) => void;
  onSetFrequency: (freqHz: number) => void;
  onBandSelect: (band: RadioBand) => void;
  onModeSelect: (mode: DemodulationMode) => void;
  onStepSelect: (stepHz: number) => void;
  onBandwidthSelect: (bandwidthHz: number) => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onSquelchChange: (db: number) => void;
  onRfGainChange: (gain: number, autoGain: boolean) => void;
  onAgcToggle: () => void;
  onPlayToggle: () => void;
  onSeek: (direction: 1 | -1) => void;
  onScanToggle: () => void;
  onRecordToggle: () => void;
  onSavePreset: () => void;
  onLanguageToggle: () => void;
  onConnectRtlSdr: () => void;
  onConnectAirspy: () => void;
  onConnectLineIn: () => void;
  onUseTestBench: () => void;

  // Advanced DSP Handlers
  onAnrToggle: (enabled: boolean, level: number) => void;
  onNotchToggle: (enabled: boolean, freqHz: number, q: number) => void;
  onBandpassQChange: (q: number) => void;
  onWirelessMicBoostChange: (boostDb: number, rumbleCut: boolean) => void;
  onSelectAudioInputDevice: (deviceId: string) => void;
}

export class DesktopOverlay {
  private container: HTMLDivElement;
  private state: ReceiverState;
  private hardwareStatus: HardwareStatus;
  private spectrumRenderer: SpectrumRenderer;
  private stationManager: StationManager;
  private recorder: AudioRecorder;
  private handlers: DesktopOverlayHandlers;

  // DOM references for fast updates
  private freqDisplayEl!: HTMLElement;
  private sMeterBarEl!: HTMLElement;
  private sMeterTextEl!: HTMLElement;
  private snrTextEl!: HTMLElement;
  private playBtnEl!: HTMLButtonElement;
  private scanBtnEl!: HTMLButtonElement;
  private recordBtnEl!: HTMLButtonElement;
  private recTimerEl!: HTMLElement;
  private hwStatusEl!: HTMLElement;
  private squelchValEl!: HTMLElement;
  private rfGainValEl!: HTMLElement;
  private anrValEl!: HTMLElement;
  private notchFreqValEl!: HTMLElement;
  private notchQValEl!: HTMLElement;
  private bpfQValEl!: HTMLElement;
  private micBoostValEl!: HTMLElement;

  // Modals
  private modalContainer!: HTMLDivElement;

  constructor(
    initialState: ReceiverState,
    hardwareStatus: HardwareStatus,
    spectrumRenderer: SpectrumRenderer,
    stationManager: StationManager,
    recorder: AudioRecorder,
    handlers: DesktopOverlayHandlers
  ) {
    this.state = initialState;
    this.hardwareStatus = hardwareStatus;
    this.spectrumRenderer = spectrumRenderer;
    this.stationManager = stationManager;
    this.recorder = recorder;
    this.handlers = handlers;

    this.container = document.createElement('div');
    this.container.id = 'desktop-radio-workstation';
    this.container.className = 'desktop-overlay-root';
    document.body.appendChild(this.container);

    this.render();
    this.setupKeyboardShortcuts();
  }

  private render(): void {
    const t = translations[this.state.language];

    this.container.innerHTML = `
      <div class="sdr-app-shell">
        <!-- TOP STATUS BAR -->
        <header class="sdr-header">
          <div class="sdr-brand">
            <span class="sdr-icon">📻</span>
            <div>
              <h1 class="sdr-title">${t.appTitle}</h1>
              <p class="sdr-subtitle">${t.appSubtitle}</p>
            </div>
          </div>

          <div class="sdr-header-actions">
            <!-- Language Switcher -->
            <button id="btn-lang" class="sdr-badge-btn" title="Tukar Bahasa / Switch Language">
              🌐 ${this.state.language === 'ms' ? 'Bahasa Melayu' : 'English'}
            </button>

            <!-- Test Suite Button -->
            <button id="btn-run-tests" class="sdr-badge-btn sdr-badge-test" title="${t.runTests}">
              🧪 ${t.testsTitle}
            </button>

            <!-- Recordings List Button -->
            <button id="btn-show-recordings" class="sdr-badge-btn" title="${t.recordingsTitle}">
              📁 ${t.recordingsTitle} (${this.recorder.recordings.length})
            </button>
          </div>
        </header>

        <!-- MAIN WORKSTATION 3-COLUMN LAYOUT -->
        <div class="sdr-main-body">
          <!-- LEFT SIDEBAR: BANDS & PRESETS -->
          <aside class="sdr-sidebar">
            <div class="sdr-panel-card">
              <h3 class="panel-heading">JALUR RADIO / BAND</h3>
              <div class="band-selector-group">
                <button class="band-btn ${this.state.band === 'FM' ? 'active' : ''}" data-band="FM">
                  <span class="band-name">${t.bandFm}</span>
                  <span class="band-range">${t.bandFmDesc}</span>
                </button>
                <button class="band-btn ${this.state.band === 'AM' ? 'active' : ''}" data-band="AM">
                  <span class="band-name">${t.bandAm}</span>
                  <span class="band-range">${t.bandAmDesc}</span>
                </button>
                <button class="band-btn ${this.state.band === 'SW' ? 'active' : ''}" data-band="SW">
                  <span class="band-name">${t.bandSw}</span>
                  <span class="band-range">${t.bandSwDesc}</span>
                </button>
                <button class="band-btn ${this.state.band === 'LINE_IN' ? 'active' : ''}" data-band="LINE_IN">
                  <span class="band-name">🎤 ${t.bandLineIn}</span>
                  <span class="band-range">${t.bandLineInDesc}</span>
                </button>
              </div>
            </div>

            <!-- WIRELESS MIC RECEIVER PREAMP CARD (HIGHLIGHTED IN LINE_IN MODE) -->
            <div class="sdr-panel-card ${this.state.band === 'LINE_IN' ? 'active-highlight' : ''}">
              <h3 class="panel-heading">🎤 ${t.wirelessMicTitle}</h3>
              <div class="slider-control-group">
                <div class="slider-label-row">
                  <span>${t.micPreampBoost}</span>
                  <span id="val-mic-boost" class="slider-val-tag">+${this.state.wirelessMicBoostDb} dB</span>
                </div>
                <input id="slider-mic-boost" type="range" min="0" max="24" step="1" value="${this.state.wirelessMicBoostDb}" class="sdr-slider" />
              </div>
              <div class="checkbox-row">
                <label class="sdr-toggle-label">
                  <input id="chk-rumble" type="checkbox" ${this.state.wirelessMicRumbleFilter ? 'checked' : ''} />
                  <span>${t.rumbleFilter}</span>
                </label>
              </div>
            </div>

            <!-- PRESETS LIST -->
            <div class="sdr-panel-card sdr-presets-panel">
              <div class="panel-header-row">
                <h3 class="panel-heading">${t.presetsTitle}</h3>
                <button id="btn-add-preset" class="btn-tiny" title="${t.savePreset}">+ Simpan</button>
              </div>
              <div id="presets-list" class="presets-scroll-list">
                <!-- Dynamically populated -->
              </div>
            </div>
          </aside>

          <!-- CENTER: SPECTRUM, WATERFALL & FREQUENCY CONSOLE -->
          <main class="sdr-center-console">
            <!-- LARGE DIGITAL FREQUENCY READOUT & TUNING DIAL -->
            <div class="freq-display-card">
              <div class="freq-top-row">
                <div class="freq-meta-badge">BAND: <strong id="meta-band">${this.state.band}</strong></div>
                <div class="freq-meta-badge">MODE: <strong id="meta-mode">${this.state.mode}</strong></div>
                <div class="freq-meta-badge">STEP: <strong id="meta-step">${this.state.stepHz / 1000} kHz</strong></div>
                <div class="freq-meta-badge">IF BW: <strong id="meta-bw">${this.state.bandwidthHz / 1000} kHz</strong></div>
                <div class="freq-meta-badge">DSP: <strong id="meta-anr" style="color: ${this.state.anrEnabled ? '#34d399' : '#64748b'}">ANR</strong> | <strong id="meta-notch" style="color: ${this.state.notchEnabled ? '#f59e0b' : '#64748b'}">NOTCH</strong></div>
              </div>

              <div class="freq-main-row">
                <button id="btn-quick-down" class="btn-freq-step" title="Langkah Turun">◀</button>
                <div class="freq-digital-wrapper">
                  <div id="digital-frequency" class="digital-frequency">
                    ${this.formatFrequency(this.state.frequencyHz)}
                  </div>
                  <div class="freq-sub-unit">MEGAHERTZ (MHz)</div>
                </div>
                <button id="btn-quick-up" class="btn-freq-step" title="Langkah Naik">▶</button>
              </div>

              <!-- Quick Frequency Entry / Tuning Wheel -->
              <div class="freq-wheel-row">
                <button class="step-chip ${this.state.stepHz === 100000 ? 'active' : ''}" data-step="100000">100k</button>
                <button class="step-chip ${this.state.stepHz === 50000 ? 'active' : ''}" data-step="50000">50k</button>
                <button class="step-chip ${this.state.stepHz === 9000 ? 'active' : ''}" data-step="9000">9k</button>
                <button class="step-chip ${this.state.stepHz === 5000 ? 'active' : ''}" data-step="5000">5k</button>
                <button class="step-chip ${this.state.stepHz === 1000 ? 'active' : ''}" data-step="1000">1k</button>
                <button class="step-chip ${this.state.stepHz === 100 ? 'active' : ''}" data-step="100">100Hz</button>
                <span class="tuning-hint-text">💡 Putar roda tetikus atau tekan anak panah untuk menala</span>
              </div>
            </div>

            <!-- REAL-TIME RF SPECTRUM ANALYZER -->
            <div class="spectrum-card">
              <div class="canvas-header-bar">
                <span class="canvas-title">⚡ ${t.spectrumTitle}</span>
                <span id="spectrum-peak-info" class="canvas-sub-info">Puncak: --</span>
              </div>
              <div id="spectrum-mount" class="canvas-container"></div>
            </div>

            <!-- WATERFALL DISPLAY -->
            <div class="waterfall-card">
              <div class="canvas-header-bar">
                <span class="canvas-title">🌊 ${t.waterfallTitle}</span>
                <span class="canvas-sub-info">Klik mana-mana isyarat untuk menala terus</span>
              </div>
              <div id="waterfall-mount" class="canvas-container"></div>
            </div>
          </main>

          <!-- RIGHT PANEL: SIGNAL METERS, HARDWARE & DEMODULATOR -->
          <aside class="sdr-right-panel">
            <!-- HARDWARE STATUS CARD (RTL-SDR & AIRSPY SDR) -->
            <div class="sdr-panel-card">
              <h3 class="panel-heading">${t.hardwareTitle}</h3>
              <div id="hw-status-box" class="hw-status-box ${this.hardwareStatus.connected ? 'status-connected' : 'status-disconnected'}">
                <div class="hw-status-dot"></div>
                <div class="hw-status-details">
                  <div class="hw-dev-name">${this.hardwareStatus.deviceName}</div>
                  <div class="hw-dev-rate">${(this.hardwareStatus.sampleRateHz / 1e6).toFixed(3)} MSPS | ${this.hardwareStatus.connected ? t.connected : t.disconnected}</div>
                </div>
              </div>

              <div class="hw-actions-col">
                <button id="btn-connect-usb" class="btn-sdr-action">🔌 ${t.connectRtlSdr}</button>
                <button id="btn-connect-airspy" class="btn-sdr-action btn-airspy">📡 ${t.connectAirspy}</button>
                <button id="btn-connect-linein" class="btn-sdr-action">🎙️ ${t.connectLineIn}</button>
                <button id="btn-use-testbench" class="btn-sdr-action">🧪 ${t.useTestSignal}</button>
              </div>
            </div>

            <!-- S-METER & SIGNAL STRENGTH CARD -->
            <div class="sdr-panel-card">
              <h3 class="panel-heading">${t.signalStrength}</h3>
              <div class="s-meter-scale">
                <span>S1</span><span>S3</span><span>S5</span><span>S7</span><span>S9</span><span>+10</span><span>+20</span><span>+30</span>
              </div>
              <div class="s-meter-bar-track">
                <div id="s-meter-fill" class="s-meter-bar-fill" style="width: 25%"></div>
              </div>
              <div class="s-meter-values-row">
                <span id="s-meter-text" class="smeter-val">S0 (-110 dBm)</span>
                <span id="snr-text" class="snr-val">SNR: 0.0 dB</span>
              </div>
            </div>

            <!-- DEMODULATION MODE SELECTOR -->
            <div class="sdr-panel-card">
              <h3 class="panel-heading">${t.mode}</h3>
              <div class="modes-grid">
                ${['WFM', 'NFM', 'AM', 'USB', 'LSB', 'CW'].map((m) => `
                  <button class="mode-btn ${this.state.mode === m ? 'active' : ''}" data-mode="${m}">${m}</button>
                `).join('')}
              </div>
            </div>

            <!-- ADVANCED DIGITAL FILTERS: ANR & NOTCH FILTER & BANDPASS Q -->
            <div class="sdr-panel-card sdr-filters-panel">
              <h3 class="panel-heading">${t.advancedFiltersTitle}</h3>

              <!-- Adaptive Noise Reduction (ANR) -->
              <div class="filter-box">
                <div class="checkbox-row">
                  <label class="sdr-toggle-label">
                    <input id="chk-anr" type="checkbox" ${this.state.anrEnabled ? 'checked' : ''} />
                    <strong style="color: #34d399">${t.anrTitle}</strong>
                  </label>
                  <span id="val-anr" class="slider-val-tag">Tahap ${this.state.anrLevel}</span>
                </div>
                <input id="slider-anr" type="range" min="1" max="10" step="1" value="${this.state.anrLevel}" class="sdr-slider" ${this.state.anrEnabled ? '' : 'disabled'} />
              </div>

              <!-- Notch Filter -->
              <div class="filter-box" style="margin-top: 8px;">
                <div class="checkbox-row">
                  <label class="sdr-toggle-label">
                    <input id="chk-notch" type="checkbox" ${this.state.notchEnabled ? 'checked' : ''} />
                    <strong style="color: #f59e0b">${t.notchTitle}</strong>
                  </label>
                  <span id="val-notch-freq" class="slider-val-tag">${this.state.notchFreqHz} Hz</span>
                </div>
                <input id="slider-notch-freq" type="range" min="50" max="5000" step="25" value="${this.state.notchFreqHz}" class="sdr-slider" ${this.state.notchEnabled ? '' : 'disabled'} />

                <div class="slider-label-row" style="margin-top: 4px;">
                  <span style="font-size: 10px;">${t.qFactor}</span>
                  <span id="val-notch-q" class="slider-val-tag" style="font-size: 10px;">Q = ${this.state.notchQ}</span>
                </div>
                <input id="slider-notch-q" type="range" min="2" max="40" step="1" value="${this.state.notchQ}" class="sdr-slider" ${this.state.notchEnabled ? '' : 'disabled'} />
              </div>

              <!-- Bandpass Filter Q Factor -->
              <div class="filter-box" style="margin-top: 8px;">
                <div class="slider-label-row">
                  <span>${t.bpfTitle}</span>
                  <span id="val-bpf-q" class="slider-val-tag">Q = ${this.state.bpfQ.toFixed(1)}</span>
                </div>
                <input id="slider-bpf-q" type="range" min="0.5" max="8.0" step="0.1" value="${this.state.bpfQ}" class="sdr-slider" />
              </div>
            </div>

            <!-- DSP SQUELCH, RF GAIN, AGC -->
            <div class="sdr-panel-card">
              <h3 class="panel-heading">KAWALAN GANDAAN & SQUELCH</h3>
              <!-- Squelch -->
              <div class="slider-control-group">
                <div class="slider-label-row">
                  <span>${t.squelch}</span>
                  <span id="val-squelch" class="slider-val-tag">${this.state.squelchDb} dBm</span>
                </div>
                <input id="slider-squelch" type="range" min="-110" max="-30" step="1" value="${this.state.squelchDb}" class="sdr-slider" />
              </div>

              <!-- RF Gain -->
              <div class="slider-control-group">
                <div class="slider-label-row">
                  <span>${t.rfGain}</span>
                  <span id="val-rfgain" class="slider-val-tag">${this.state.rfGainAuto ? 'AUTO' : this.state.rfGainDb + ' dB'}</span>
                </div>
                <input id="slider-rfgain" type="range" min="0" max="49.6" step="1" value="${this.state.rfGainDb}" class="sdr-slider" ${this.state.rfGainAuto ? 'disabled' : ''} />
              </div>

              <div class="checkbox-row">
                <label class="sdr-toggle-label">
                  <input id="chk-rf-auto" type="checkbox" ${this.state.rfGainAuto ? 'checked' : ''} />
                  <span>${t.rfGainAuto}</span>
                </label>
                <label class="sdr-toggle-label">
                  <input id="chk-agc" type="checkbox" ${this.state.agcEnabled ? 'checked' : ''} />
                  <span>${t.agc}</span>
                </label>
              </div>
            </div>
          </aside>
        </div>

        <!-- BOTTOM CONTROL BAR -->
        <footer class="sdr-footer">
          <div class="footer-left-controls">
            <!-- Play / Stop -->
            <button id="btn-play-toggle" class="btn-primary-action ${this.state.isPlaying ? 'btn-danger' : 'btn-success'}">
              ${this.state.isPlaying ? '⏹ ' + t.stop : '▶ ' + t.play}
            </button>

            <!-- Seek Up / Down -->
            <button id="btn-seek-down" class="btn-footer-secondary" title="${t.seekDown}">⏮ CARI -</button>
            <button id="btn-seek-up" class="btn-footer-secondary" title="${t.seekUp}">CARI + ⏭</button>

            <!-- Auto Scan -->
            <button id="btn-scan-toggle" class="btn-footer-secondary ${this.state.isScanning ? 'active-scan' : ''}">
              ${this.state.isScanning ? '⏹ ' + t.stopScan : '🔍 ' + t.autoScan}
            </button>
          </div>

          <!-- Volume & Mute -->
          <div class="footer-center-controls">
            <button id="btn-mute" class="btn-icon-square" title="${t.mute}">
              ${this.state.muted ? '🔇' : '🔊'}
            </button>
            <input id="slider-volume" type="range" min="0" max="1" step="0.01" value="${this.state.volume}" class="volume-slider" title="${t.volume}" />
            <span id="val-volume" class="slider-val-tag">${Math.round(this.state.volume * 100)}%</span>
          </div>

          <div class="footer-right-controls">
            <!-- Record WAV -->
            <button id="btn-record-toggle" class="btn-record ${this.state.isRecording ? 'recording-active' : ''}">
              <span class="rec-dot"></span>
              <span id="rec-btn-text">${this.state.isRecording ? t.stopRecord : t.record}</span>
              <span id="rec-timer" class="rec-timer-badge" style="display: ${this.state.isRecording ? 'inline-block' : 'none'};">00:00</span>
            </button>

            <!-- Save Preset -->
            <button id="btn-save-preset" class="btn-footer-secondary">
              ⭐ ${t.savePreset}
            </button>
          </div>
        </footer>
      </div>

      <!-- MODALS CONTAINER -->
      <div id="modal-container" class="sdr-modal-backdrop" style="display: none;"></div>
    `;

    // Mount Canvas Elements
    const specMount = this.container.querySelector('#spectrum-mount');
    if (specMount) {
      specMount.appendChild(this.spectrumRenderer.spectrumCanvas);
      this.spectrumRenderer.spectrumCanvas.className = 'sdr-canvas';
    }

    const wfMount = this.container.querySelector('#waterfall-mount');
    if (wfMount) {
      wfMount.appendChild(this.spectrumRenderer.waterfallCanvas);
      this.spectrumRenderer.waterfallCanvas.className = 'sdr-canvas';
    }

    // Cache element references
    this.freqDisplayEl = this.container.querySelector('#digital-frequency')!;
    this.sMeterBarEl = this.container.querySelector('#s-meter-fill')!;
    this.sMeterTextEl = this.container.querySelector('#s-meter-text')!;
    this.snrTextEl = this.container.querySelector('#snr-text')!;
    this.playBtnEl = this.container.querySelector('#btn-play-toggle') as HTMLButtonElement;
    this.scanBtnEl = this.container.querySelector('#btn-scan-toggle') as HTMLButtonElement;
    this.recordBtnEl = this.container.querySelector('#btn-record-toggle') as HTMLButtonElement;
    this.recTimerEl = this.container.querySelector('#rec-timer')!;
    this.hwStatusEl = this.container.querySelector('#hw-status-box')!;
    this.squelchValEl = this.container.querySelector('#val-squelch')!;
    this.rfGainValEl = this.container.querySelector('#val-rfgain')!;
    this.anrValEl = this.container.querySelector('#val-anr')!;
    this.notchFreqValEl = this.container.querySelector('#val-notch-freq')!;
    this.notchQValEl = this.container.querySelector('#val-notch-q')!;
    this.bpfQValEl = this.container.querySelector('#val-bpf-q')!;
    this.micBoostValEl = this.container.querySelector('#val-mic-boost')!;
    this.modalContainer = this.container.querySelector('#modal-container') as HTMLDivElement;

    // Attach listeners
    this.bindEvents();
    this.renderPresets();
  }

  private bindEvents(): void {
    // Canvas click to tune
    this.spectrumRenderer.spectrumCanvas.addEventListener('click', (e) => {
      const rect = this.spectrumRenderer.spectrumCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.spectrumRenderer.spectrumCanvas.width / rect.width);
      const span = this.hardwareStatus.sampleRateHz;
      const targetFreq = this.spectrumRenderer.getFrequencyAtX(x, this.state.frequencyHz, span);
      this.handlers.onSetFrequency(targetFreq);
    });

    this.spectrumRenderer.waterfallCanvas.addEventListener('click', (e) => {
      const rect = this.spectrumRenderer.waterfallCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.spectrumRenderer.waterfallCanvas.width / rect.width);
      const span = this.hardwareStatus.sampleRateHz;
      const targetFreq = this.spectrumRenderer.getFrequencyAtX(x, this.state.frequencyHz, span);
      this.handlers.onSetFrequency(targetFreq);
    });

    // Language Toggle
    this.container.querySelector('#btn-lang')?.addEventListener('click', () => {
      this.handlers.onLanguageToggle();
      this.render();
    });

    // Bands
    this.container.querySelectorAll('.band-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const band = (btn as HTMLElement).dataset.band as RadioBand;
        this.handlers.onBandSelect(band);
        this.render();
      });
    });

    // Quick Step buttons
    this.container.querySelectorAll('.step-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt((btn as HTMLElement).dataset.step || '100000', 10);
        this.handlers.onStepSelect(step);
      });
    });

    // Quick arrows
    this.container.querySelector('#btn-quick-down')?.addEventListener('click', () => {
      this.handlers.onTune(-this.state.stepHz);
    });
    this.container.querySelector('#btn-quick-up')?.addEventListener('click', () => {
      this.handlers.onTune(this.state.stepHz);
    });

    // Modes
    this.container.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as DemodulationMode;
        this.handlers.onModeSelect(mode);
      });
    });

    // DSP Controls: Squelch & RF Gain
    const squelchSlider = this.container.querySelector('#slider-squelch') as HTMLInputElement;
    squelchSlider?.addEventListener('input', () => {
      const val = parseFloat(squelchSlider.value);
      this.squelchValEl.textContent = `${val} dBm`;
      this.handlers.onSquelchChange(val);
    });

    const rfSlider = this.container.querySelector('#slider-rfgain') as HTMLInputElement;
    const rfAutoChk = this.container.querySelector('#chk-rf-auto') as HTMLInputElement;

    rfSlider?.addEventListener('input', () => {
      const val = parseFloat(rfSlider.value);
      this.rfGainValEl.textContent = `${val.toFixed(1)} dB`;
      this.handlers.onRfGainChange(val, false);
    });

    rfAutoChk?.addEventListener('change', () => {
      rfSlider.disabled = rfAutoChk.checked;
      this.rfGainValEl.textContent = rfAutoChk.checked ? 'AUTO' : `${parseFloat(rfSlider.value).toFixed(1)} dB`;
      this.handlers.onRfGainChange(parseFloat(rfSlider.value), rfAutoChk.checked);
    });

    this.container.querySelector('#chk-agc')?.addEventListener('change', () => {
      this.handlers.onAgcToggle();
    });

    // --- ADVANCED DSP FILTERS LISTENERS ---
    const anrChk = this.container.querySelector('#chk-anr') as HTMLInputElement;
    const anrSlider = this.container.querySelector('#slider-anr') as HTMLInputElement;
    anrChk?.addEventListener('change', () => {
      anrSlider.disabled = !anrChk.checked;
      this.handlers.onAnrToggle(anrChk.checked, parseInt(anrSlider.value, 10));
    });
    anrSlider?.addEventListener('input', () => {
      const lvl = parseInt(anrSlider.value, 10);
      this.anrValEl.textContent = `Tahap ${lvl}`;
      this.handlers.onAnrToggle(anrChk.checked, lvl);
    });

    const notchChk = this.container.querySelector('#chk-notch') as HTMLInputElement;
    const notchFreqSlider = this.container.querySelector('#slider-notch-freq') as HTMLInputElement;
    const notchQSlider = this.container.querySelector('#slider-notch-q') as HTMLInputElement;

    const onNotchInput = () => {
      const f = parseInt(notchFreqSlider.value, 10);
      const q = parseInt(notchQSlider.value, 10);
      notchFreqSlider.disabled = !notchChk.checked;
      notchQSlider.disabled = !notchChk.checked;
      this.notchFreqValEl.textContent = `${f} Hz`;
      this.notchQValEl.textContent = `Q = ${q}`;
      this.handlers.onNotchToggle(notchChk.checked, f, q);
    };

    notchChk?.addEventListener('change', onNotchInput);
    notchFreqSlider?.addEventListener('input', onNotchInput);
    notchQSlider?.addEventListener('input', onNotchInput);

    const bpfQSlider = this.container.querySelector('#slider-bpf-q') as HTMLInputElement;
    bpfQSlider?.addEventListener('input', () => {
      const q = parseFloat(bpfQSlider.value);
      this.bpfQValEl.textContent = `Q = ${q.toFixed(1)}`;
      this.handlers.onBandpassQChange(q);
    });

    // Wireless Mic Preamp Boost & Rumble Cut
    const micBoostSlider = this.container.querySelector('#slider-mic-boost') as HTMLInputElement;
    const rumbleChk = this.container.querySelector('#chk-rumble') as HTMLInputElement;
    const onMicBoostInput = () => {
      const boost = parseInt(micBoostSlider.value, 10);
      this.micBoostValEl.textContent = `+${boost} dB`;
      this.handlers.onWirelessMicBoostChange(boost, rumbleChk.checked);
    };
    micBoostSlider?.addEventListener('input', onMicBoostInput);
    rumbleChk?.addEventListener('change', onMicBoostInput);

    // Hardware connect buttons
    this.container.querySelector('#btn-connect-usb')?.addEventListener('click', () => {
      this.handlers.onConnectRtlSdr();
    });
    this.container.querySelector('#btn-connect-airspy')?.addEventListener('click', () => {
      this.handlers.onConnectAirspy();
    });
    this.container.querySelector('#btn-connect-linein')?.addEventListener('click', () => {
      this.handlers.onConnectLineIn();
    });
    this.container.querySelector('#btn-use-testbench')?.addEventListener('click', () => {
      this.handlers.onUseTestBench();
    });

    // Footer actions
    this.playBtnEl?.addEventListener('click', () => this.handlers.onPlayToggle());
    this.scanBtnEl?.addEventListener('click', () => this.handlers.onScanToggle());
    this.container.querySelector('#btn-seek-down')?.addEventListener('click', () => this.handlers.onSeek(-1));
    this.container.querySelector('#btn-seek-up')?.addEventListener('click', () => this.handlers.onSeek(1));

    const volSlider = this.container.querySelector('#slider-volume') as HTMLInputElement;
    volSlider?.addEventListener('input', () => {
      const v = parseFloat(volSlider.value);
      const valTag = this.container.querySelector('#val-volume');
      if (valTag) valTag.textContent = `${Math.round(v * 100)}%`;
      this.handlers.onVolumeChange(v);
    });

    this.container.querySelector('#btn-mute')?.addEventListener('click', () => {
      this.handlers.onMuteToggle();
      const muteBtn = this.container.querySelector('#btn-mute');
      if (muteBtn) muteBtn.textContent = this.state.muted ? '🔇' : '🔊';
    });

    this.recordBtnEl?.addEventListener('click', () => this.handlers.onRecordToggle());
    this.container.querySelector('#btn-save-preset')?.addEventListener('click', () => this.handlers.onSavePreset());
    this.container.querySelector('#btn-add-preset')?.addEventListener('click', () => this.handlers.onSavePreset());

    // Test Suite Modal Button
    this.container.querySelector('#btn-run-tests')?.addEventListener('click', () => {
      void this.showTestsModal();
    });

    // Recordings Modal Button
    this.container.querySelector('#btn-show-recordings')?.addEventListener('click', () => {
      this.showRecordingsModal();
    });
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.handlers.onTune(this.state.stepHz);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.handlers.onTune(-this.state.stepHz);
          break;
        case ' ':
          e.preventDefault();
          this.handlers.onPlayToggle();
          break;
        case 'm':
        case 'M':
          this.handlers.onMuteToggle();
          break;
        case 'r':
        case 'R':
          this.handlers.onRecordToggle();
          break;
        case 's':
        case 'S':
          if (e.ctrlKey) {
            e.preventDefault();
            this.handlers.onSavePreset();
          }
          break;
      }
    });
  }

  updateState(newState: ReceiverState, newHwStatus: HardwareStatus): void {
    this.state = newState;
    this.hardwareStatus = newHwStatus;
    const t = translations[this.state.language];

    if (this.freqDisplayEl) {
      this.freqDisplayEl.textContent = this.formatFrequency(this.state.frequencyHz);
    }

    // S-Meter updates
    if (this.sMeterBarEl) {
      const norm = Math.max(5, Math.min(100, ((this.state.signalStrengthDbm - (-120)) / 100) * 100));
      this.sMeterBarEl.style.width = `${norm}%`;
      this.sMeterBarEl.style.backgroundColor = norm > 75 ? '#ef4444' : norm > 45 ? '#22c55e' : '#38bdf8';
    }

    if (this.sMeterTextEl) {
      this.sMeterTextEl.textContent = `S${this.state.sMeterValue} (${this.state.signalStrengthDbm.toFixed(1)} dBm)`;
    }

    if (this.snrTextEl) {
      this.snrTextEl.textContent = `SNR: ${this.state.snrDb.toFixed(1)} dB`;
    }

    // Buttons
    if (this.playBtnEl) {
      this.playBtnEl.textContent = this.state.isPlaying ? '⏹ ' + t.stop : '▶ ' + t.play;
      this.playBtnEl.className = `btn-primary-action ${this.state.isPlaying ? 'btn-danger' : 'btn-success'}`;
    }

    if (this.scanBtnEl) {
      this.scanBtnEl.textContent = this.state.isScanning ? '⏹ ' + t.stopScan : '🔍 ' + t.autoScan;
      this.scanBtnEl.className = `btn-footer-secondary ${this.state.isScanning ? 'active-scan' : ''}`;
    }

    if (this.recordBtnEl) {
      const txt = this.recordBtnEl.querySelector('#rec-btn-text');
      if (txt) txt.textContent = this.state.isRecording ? t.stopRecord : t.record;
      this.recordBtnEl.className = `btn-record ${this.state.isRecording ? 'recording-active' : ''}`;
    }

    if (this.recTimerEl) {
      this.recTimerEl.style.display = this.state.isRecording ? 'inline-block' : 'none';
      const m = String(Math.floor(this.state.recordingSeconds / 60)).padStart(2, '0');
      const s = String(this.state.recordingSeconds % 60).padStart(2, '0');
      this.recTimerEl.textContent = `${m}:${s}`;
    }

    // Peak label in spectrum
    const peakInfo = this.container.querySelector('#spectrum-peak-info');
    if (peakInfo) {
      const peakFreqMhz = ((this.state.frequencyHz + this.spectrumRenderer.peakFreqOffsetHz) / 1e6).toFixed(3);
      peakInfo.textContent = `Puncak: ${peakFreqMhz} MHz (${this.spectrumRenderer.peakPowerDbm.toFixed(1)} dBm)`;
    }

    // Meta badges
    const metaBw = this.container.querySelector('#meta-bw');
    if (metaBw) metaBw.textContent = `${this.state.bandwidthHz / 1000} kHz`;

    const metaStep = this.container.querySelector('#meta-step');
    if (metaStep) metaStep.textContent = `${this.state.stepHz / 1000} kHz`;

    const metaMode = this.container.querySelector('#meta-mode');
    if (metaMode) metaMode.textContent = this.state.mode;

    const metaBand = this.container.querySelector('#meta-band');
    if (metaBand) metaBand.textContent = this.state.band;

    const metaAnr = this.container.querySelector('#meta-anr') as HTMLElement;
    if (metaAnr) metaAnr.style.color = this.state.anrEnabled ? '#34d399' : '#64748b';

    const metaNotch = this.container.querySelector('#meta-notch') as HTMLElement;
    if (metaNotch) metaNotch.style.color = this.state.notchEnabled ? '#f59e0b' : '#64748b';
  }

  renderPresets(): void {
    const listEl = this.container.querySelector('#presets-list');
    if (!listEl) return;

    const presets = this.stationManager.getPresetsForBand(this.state.band);
    if (presets.length === 0) {
      listEl.innerHTML = `<div class="empty-hint">Tiada stesen disimpan untuk jalur ini.</div>`;
      return;
    }

    listEl.innerHTML = presets
      .map(
        (p) => `
        <div class="preset-item ${Math.abs(p.frequencyHz - this.state.frequencyHz) < 100 ? 'active' : ''}" data-id="${p.id}" data-freq="${p.frequencyHz}" data-mode="${p.mode}">
          <div class="preset-info">
            <span class="preset-name">${p.name}</span>
            <span class="preset-freq">${(p.frequencyHz / 1e6).toFixed(3)} MHz (${p.mode})</span>
          </div>
          <button class="btn-del-preset" data-del="${p.id}" title="Padam">✕</button>
        </div>
      `
      )
      .join('');

    // Click handler for preset tuning
    listEl.querySelectorAll('.preset-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('btn-del-preset')) {
          const delId = (e.target as HTMLElement).dataset.del!;
          this.stationManager.removePreset(delId);
          this.renderPresets();
          return;
        }
        const f = parseInt((item as HTMLElement).dataset.freq || '0', 10);
        const m = (item as HTMLElement).dataset.mode as DemodulationMode;
        if (f > 0) {
          this.handlers.onSetFrequency(f);
          if (m) this.handlers.onModeSelect(m);
        }
      });
    });
  }

  private async showTestsModal(): Promise<void> {
    const t = translations[this.state.language];
    this.modalContainer.style.display = 'flex';
    this.modalContainer.innerHTML = `
      <div class="sdr-modal-box">
        <div class="modal-header">
          <h2>🧪 ${t.testsTitle}</h2>
          <button id="modal-close" class="modal-close-btn">✕</button>
        </div>
        <p class="modal-intro">Menguji pengesahan matematik DSP, pematuhan demodulasi WFM/AM/SSB/CW, penapis takuk (notch), pengurangan hingar adaptif (ANR), penapis gegaran mic tanpa wayar, penukaran frekuensi, FFT Cooley-Tukey, dan abstraksi perkakasan RTL-SDR & Airspy.</p>
        <div id="test-results-list" class="test-results-container">
          <div class="loading-tests">Sedang menjalankan ujian DSP automatik...</div>
        </div>
      </div>
    `;

    this.modalContainer.querySelector('#modal-close')?.addEventListener('click', () => {
      this.modalContainer.style.display = 'none';
    });

    const results = await RadioTestSuite.runAllTests();
    const listEl = this.modalContainer.querySelector('#test-results-list');
    if (!listEl) return;

    listEl.innerHTML = results
      .map(
        (r) => `
        <div class="test-item ${r.passed ? 'test-passed' : 'test-failed'}">
          <div class="test-badge">${r.passed ? '✔ LULUS' : '✖ GAGAL'}</div>
          <div class="test-details">
            <div class="test-name"><strong>[${r.category}]</strong> ${r.name}</div>
            <div class="test-msg">${r.message}</div>
          </div>
        </div>
      `
      )
      .join('');
  }

  private showRecordingsModal(): void {
    const t = translations[this.state.language];
    this.modalContainer.style.display = 'flex';
    this.modalContainer.innerHTML = `
      <div class="sdr-modal-box">
        <div class="modal-header">
          <h2>📁 ${t.recordingsTitle}</h2>
          <button id="modal-close" class="modal-close-btn">✕</button>
        </div>
        <div class="recordings-container">
          ${
            this.recorder.recordings.length === 0
              ? `<div class="empty-hint">${t.noRecordings}</div>`
              : this.recorder.recordings
                  .map(
                    (rec) => `
              <div class="rec-item">
                <div class="rec-info">
                  <strong>${rec.fileName}</strong>
                  <span>${(rec.frequencyHz / 1e6).toFixed(3)} MHz (${rec.band} / ${rec.mode}) • ${rec.durationSeconds}s • ${(rec.sizeBytes / 1024).toFixed(1)} KB</span>
                </div>
                <div class="rec-actions">
                  <audio src="${rec.url}" controls class="rec-audio-player"></audio>
                  <button class="btn-download" data-recid="${rec.id}">⬇ ${t.downloadWav}</button>
                </div>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    this.modalContainer.querySelector('#modal-close')?.addEventListener('click', () => {
      this.modalContainer.style.display = 'none';
    });

    this.modalContainer.querySelectorAll('.btn-download').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.recid;
        const rec = this.recorder.recordings.find((r) => r.id === id);
        if (rec) this.recorder.downloadRecording(rec);
      });
    });
  }

  private formatFrequency(freqHz: number): string {
    if (freqHz >= 1_000_000) {
      return (freqHz / 1e6).toFixed(4);
    } else {
      return (freqHz / 1e3).toFixed(1);
    }
  }
}
