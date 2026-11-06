import * as THREE from 'three';
import * as xb from 'xrblocks';
import { ReceiverState } from '../types.js';
import { translations } from '../translations.js';
import { SpectrumRenderer } from './spectrumCanvas.js';

export interface SpatialRadioCallbacks {
  onTune: (deltaHz: number) => void;
  onPlayToggle: () => void;
  onScanToggle: () => void;
  onModeSelect: (mode: any) => void;
  onBandSelect: (band: any) => void;
  onAnrToggle?: () => void;
  onNotchToggle?: () => void;
}

export class SpatialRadioScene extends xb.Script {
  private state: ReceiverState;
  private spectrumRenderer: SpectrumRenderer;
  private callbacks: SpatialRadioCallbacks;

  // 3D Objects
  private tuningKnobMesh?: THREE.Mesh;
  private spectrumTexture?: THREE.CanvasTexture;
  private waterfallTexture?: THREE.CanvasTexture;

  // 3D UI Elements
  private freqText?: xb.UIText;
  private sMeterText?: xb.UIText;
  private bandModeText?: xb.UIText;
  private dspFilterText?: xb.UIText;
  private statusText?: xb.UIText;
  private playButton?: xb.UIButton;
  private scanButton?: xb.UIButton;
  private anrButton?: xb.UIButton;
  private notchButton?: xb.UIButton;

  constructor(
    initialState: ReceiverState,
    spectrumRenderer: SpectrumRenderer,
    callbacks: SpatialRadioCallbacks
  ) {
    super();
    this.state = initialState;
    this.spectrumRenderer = spectrumRenderer;
    this.callbacks = callbacks;
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x223344, 2.8));
    const dirLight = new THREE.DirectionalLight(0x70aaff, 1.8);
    dirLight.position.set(0, 3, 1);
    this.add(dirLight);

    // Create 3D Canvas Textures for Spectrum and Waterfall
    this.spectrumTexture = new THREE.CanvasTexture(this.spectrumRenderer.spectrumCanvas);
    this.spectrumTexture.minFilter = THREE.LinearFilter;
    this.spectrumTexture.magFilter = THREE.LinearFilter;

    this.waterfallTexture = new THREE.CanvasTexture(this.spectrumRenderer.waterfallCanvas);
    this.waterfallTexture.minFilter = THREE.LinearFilter;
    this.waterfallTexture.magFilter = THREE.LinearFilter;

    // Create the 3D Tuning Dial Knob
    const knobGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 32);
    const knobMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.8,
      roughness: 0.3,
    });
    this.tuningKnobMesh = new THREE.Mesh(knobGeom, knobMat);
    this.tuningKnobMesh.rotation.x = Math.PI / 2;
    this.tuningKnobMesh.position.set(0.42, 1.25, -1.08);

    // Add pointer notch on dial
    const notchGeom = new THREE.BoxGeometry(0.012, 0.042, 0.03);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const notchMesh = new THREE.Mesh(notchGeom, notchMat);
    notchMesh.position.set(0, 0, 0.06);
    this.tuningKnobMesh.add(notchMesh);
    this.add(this.tuningKnobMesh);

    // Build the Main 3D Spatial Radio Console Card
    this.buildSpatialCard();
  }

  private buildSpatialCard() {
    const t = translations[this.state.language];

    // Big Digital Frequency Readout
    this.freqText = new xb.UIText({
      text: this.formatFrequency(this.state.frequencyHz),
      style: {
        fontSize: 38,
        fontWeight: 'bold',
        color: '#00ffcc',
        textAlign: 'center',
        padding: 6,
        backgroundColor: '#050c18',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#1e3a5f',
      },
    });

    this.bandModeText = new xb.UIText({
      text: `${this.state.band} | ${this.state.mode} | STEP: ${this.state.stepHz / 1000} kHz`,
      style: {
        fontSize: 16,
        color: '#93c5fd',
        textAlign: 'center',
      },
    });

    this.sMeterText = new xb.UIText({
      text: `S-METER: S${this.state.sMeterValue} (${this.state.signalStrengthDbm} dBm) | SNR: ${this.state.snrDb} dB`,
      style: {
        fontSize: 15,
        color: '#4ade80',
        textAlign: 'center',
      },
    });

    this.dspFilterText = new xb.UIText({
      text: `DSP: ANR ${this.state.anrEnabled ? '[AKTIF]' : '[PADAM]'} | NOTCH ${this.state.notchEnabled ? `[${this.state.notchFreqHz}Hz]` : '[PADAM]'} | BPF Q:${this.state.bpfQ.toFixed(1)}`,
      style: {
        fontSize: 13,
        color: '#38bdf8',
        textAlign: 'center',
      },
    });

    this.statusText = new xb.UIText({
      text: this.state.isPlaying ? 'STATUS: RECEIVING RF STREAM' : 'STATUS: STANDBY (PRESS START)',
      style: {
        fontSize: 13,
        color: '#cbd5e1',
        textAlign: 'center',
        opacity: 0.8,
      },
    });

    // Spectrum Display Element
    const spectrumImage = new xb.UIImage({
      src: this.spectrumTexture!,
      ariaLabel: 'RF Spectrum Analyzer',
      style: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        objectFit: 'fill',
        backgroundColor: '#060a12',
      },
    });

    // Waterfall Display Element
    const waterfallImage = new xb.UIImage({
      src: this.waterfallTexture!,
      ariaLabel: 'RF Waterfall Display',
      style: {
        width: '100%',
        height: 80,
        borderRadius: 8,
        objectFit: 'fill',
        backgroundColor: '#060a12',
      },
    });

    // Tuning Controls Row
    const tuneDownButton = new xb.UIButton({
      label: '◀ TUNE -',
      style: { flexGrow: 1, backgroundColor: '#1e293b' },
      onClick: () => {
        this.callbacks.onTune(-this.state.stepHz);
        this.rotateKnob(-0.2);
      },
    });

    const tuneUpButton = new xb.UIButton({
      label: 'TUNE + ▶',
      style: { flexGrow: 1, backgroundColor: '#1e293b' },
      onClick: () => {
        this.callbacks.onTune(this.state.stepHz);
        this.rotateKnob(0.2);
      },
    });

    this.playButton = new xb.UIButton({
      label: this.state.isPlaying ? t.stop : t.play,
      icon: this.state.isPlaying ? 'pause' : 'play_arrow',
      style: { flexGrow: 1, backgroundColor: this.state.isPlaying ? '#dc2626' : '#16a34a' },
      onClick: () => this.callbacks.onPlayToggle(),
    });

    this.scanButton = new xb.UIButton({
      label: this.state.isScanning ? t.stopScan : t.autoScan,
      icon: 'search',
      style: { flexGrow: 1, backgroundColor: this.state.isScanning ? '#ea580c' : '#2563eb' },
      onClick: () => this.callbacks.onScanToggle(),
    });

    // Quick Band buttons
    const bandButtons = ['FM', 'AM', 'SW', 'LINE_IN'].map((b) => {
      return new xb.UIButton({
        label: b === 'LINE_IN' ? '3.5mm' : b,
        style: {
          flexGrow: 1,
          backgroundColor: this.state.band === b ? '#2563eb' : '#1e293b',
        },
        onClick: () => this.callbacks.onBandSelect(b),
      });
    });

    // Advanced DSP filter toggle buttons
    this.anrButton = new xb.UIButton({
      label: `ANR: ${this.state.anrEnabled ? 'ON' : 'OFF'}`,
      style: {
        flexGrow: 1,
        backgroundColor: this.state.anrEnabled ? '#059669' : '#1e293b',
      },
      onClick: () => this.callbacks.onAnrToggle?.(),
    });

    this.notchButton = new xb.UIButton({
      label: `NOTCH: ${this.state.notchEnabled ? 'ON' : 'OFF'}`,
      style: {
        flexGrow: 1,
        backgroundColor: this.state.notchEnabled ? '#d97706' : '#1e293b',
      },
      onClick: () => this.callbacks.onNotchToggle?.(),
    });

    const mainCard = new xb.UICard({
      size: { width: 0.88, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 16,
        backgroundColor: 'rgba(11, 17, 29, 0.92)',
        borderColor: '#1e3a5f',
        borderWidth: 1.5,
        borderRadius: 16,
      },
      children: [
        new xb.UIExitButton(),
        new xb.UIText({
          text: t.appTitle,
          style: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#60a5fa' },
        }),
        this.freqText,
        this.bandModeText,
        this.sMeterText,
        this.dspFilterText,
        spectrumImage,
        waterfallImage,
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: bandButtons,
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [tuneDownButton, tuneUpButton, this.playButton, this.scanButton],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [this.anrButton, this.notchButton],
        }),
        this.statusText,
      ],
    });

    mainCard.position.set(0, 1.45, -1.1);
    this.add(mainCard);
  }

  update() {
    // Notify textures to update from canvas
    if (this.spectrumTexture) this.spectrumTexture.needsUpdate = true;
    if (this.waterfallTexture) this.waterfallTexture.needsUpdate = true;
  }

  updateState(newState: ReceiverState) {
    this.state = newState;
    const t = translations[this.state.language];

    if (this.freqText) {
      this.freqText.text = this.formatFrequency(this.state.frequencyHz);
    }
    if (this.bandModeText) {
      this.bandModeText.text = `${this.state.band} | ${this.state.mode} | STEP: ${this.state.stepHz / 1000} kHz`;
    }
    if (this.sMeterText) {
      this.sMeterText.text = `S-METER: S${this.state.sMeterValue} (${this.state.signalStrengthDbm} dBm) | SNR: ${this.state.snrDb} dB`;
    }
    if (this.dspFilterText) {
      this.dspFilterText.text = `DSP: ANR ${this.state.anrEnabled ? '[ON]' : '[OFF]'} | NOTCH ${this.state.notchEnabled ? `[${this.state.notchFreqHz}Hz]` : '[OFF]'} | BPF Q:${this.state.bpfQ.toFixed(1)}`;
    }
    if (this.anrButton) {
      this.anrButton.label = `ANR: ${this.state.anrEnabled ? 'ON' : 'OFF'}`;
      this.anrButton.style.backgroundColor = this.state.anrEnabled ? '#059669' : '#1e293b';
    }
    if (this.notchButton) {
      this.notchButton.label = `NOTCH: ${this.state.notchEnabled ? 'ON' : 'OFF'}`;
      this.notchButton.style.backgroundColor = this.state.notchEnabled ? '#d97706' : '#1e293b';
    }
    if (this.playButton) {
      this.playButton.label = this.state.isPlaying ? t.stop : t.play;
      this.playButton.style.backgroundColor = this.state.isPlaying ? '#dc2626' : '#16a34a';
    }
    if (this.scanButton) {
      this.scanButton.label = this.state.isScanning ? t.stopScan : t.autoScan;
      this.scanButton.style.backgroundColor = this.state.isScanning ? '#ea580c' : '#2563eb';
    }
    if (this.statusText) {
      this.statusText.text = this.state.isScanning
        ? 'STATUS: AUTO SCANNING PASSBAND...'
        : this.state.isPlaying
          ? 'STATUS: RECEIVING RF STREAM'
          : 'STATUS: STANDBY';
    }
  }

  rotateKnob(angle: number) {
    if (this.tuningKnobMesh) {
      this.tuningKnobMesh.rotation.y += angle;
    }
  }

  private formatFrequency(freqHz: number): string {
    if (freqHz >= 1_000_000) {
      return (freqHz / 1e6).toFixed(4) + ' MHz';
    } else {
      return (freqHz / 1e3).toFixed(1) + ' kHz';
    }
  }

  dispose() {
    this.tuningKnobMesh?.geometry.dispose();
    this.spectrumTexture?.dispose();
    this.waterfallTexture?.dispose();
  }
}
