import { Language } from './types.js';

export interface TranslationDictionary {
  appTitle: string;
  appSubtitle: string;
  tagline: string;
  langSelect: string;
  // Bands
  bandFm: string;
  bandAm: string;
  bandSw: string;
  bandLineIn: string;
  bandFmDesc: string;
  bandAmDesc: string;
  bandSwDesc: string;
  bandLineInDesc: string;
  // Controls
  play: string;
  stop: string;
  mute: string;
  unmute: string;
  volume: string;
  tuneUp: string;
  tuneDown: string;
  seekUp: string;
  seekDown: string;
  autoScan: string;
  stopScan: string;
  record: string;
  stopRecord: string;
  savePreset: string;
  stepSize: string;
  bandwidth: string;
  // Demodulation modes
  mode: string;
  modeWfm: string;
  modeNfm: string;
  modeAm: string;
  modeUsb: string;
  modeLsb: string;
  modeCw: string;
  // Hardware & Signal
  hardwareTitle: string;
  deviceStatus: string;
  connected: string;
  disconnected: string;
  connectRtlSdr: string;
  connectLineIn: string;
  useTestSignal: string;
  sampleRate: string;
  rfGain: string;
  rfGainAuto: string;
  ppmCorrection: string;
  signalStrength: string;
  snr: string;
  squelch: string;
  agc: string;
  noiseBlanker: string;
  stereo: string;
  mono: string;
  // Spectrum & Waterfall
  spectrumTitle: string;
  waterfallTitle: string;
  fftSize: string;
  averaging: string;
  centerFreq: string;
  span: string;
  // Presets & Stations
  presetsTitle: string;
  addPreset: string;
  deletePreset: string;
  exportJson: string;
  importJson: string;
  stationName: string;
  category: string;
  // Recordings
  recordingsTitle: string;
  noRecordings: string;
  downloadWav: string;
  duration: string;
  // Self Tests
  testsTitle: string;
  runTests: string;
  testPassed: string;
  testFailed: string;
  // Audio Jack Disclaimer
  audioJackNotice: string;
  hardwareNote: string;
  // XR Instructions
  xrReminder: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  ms: {
    appTitle: 'PENALA RADIO PINTAR PROFESIONAL',
    appSubtitle: 'Penerima Radio Multi-Jalur & SDR Workstation',
    tagline: 'Pemprosesan Isyarat Digital Sebenar (DSP) & Antara Muka Perkakasan RTL-SDR',
    langSelect: 'Bahasa',
    // Bands
    bandFm: 'FM Siaran',
    bandAm: 'AM / Gelombang Sederhana',
    bandSw: 'Gelombang Pendek (HF)',
    bandLineIn: 'Input Audio Analog (3.5mm)',
    bandFmDesc: '87.5 MHz – 108.0 MHz (WFM)',
    bandAmDesc: '530 kHz – 1710 kHz (AM)',
    bandSwDesc: '1.7 MHz – 30.0 MHz (AM / SSB / CW)',
    bandLineInDesc: 'Pemantauan Audio Analog Sebenar dari bicu 3.5mm / Line-In',
    // Controls
    play: 'MULA',
    stop: 'HENTI',
    mute: 'NYAHBISU',
    unmute: 'BUNYI',
    volume: 'Kelantangan',
    tuneUp: 'TALIKAN NAIK',
    tuneDown: 'TALIKAN TURUN',
    seekUp: 'CARI ATAS',
    seekDown: 'CARI BAWAH',
    autoScan: 'IMBASAN AUTO',
    stopScan: 'HENTI IMBAS',
    record: 'RAKAM WAV',
    stopRecord: 'HENTI RAKAM',
    savePreset: 'SIMPAN PRATETAP',
    stepSize: 'Langkah Frekuensi',
    bandwidth: 'Lebar Jalur IF',
    // Modes
    mode: 'Mod Demodulasi',
    modeWfm: 'WFM (Wide FM)',
    modeNfm: 'NFM (Narrow FM)',
    modeAm: 'AM (Amplitude)',
    modeUsb: 'USB (Upper Sideband)',
    modeLsb: 'LSB (Lower Sideband)',
    modeCw: 'CW (Morse Code)',
    // Hardware & Signal
    hardwareTitle: 'Status Perkakasan SDR',
    deviceStatus: 'Status Peranti',
    connected: 'TERSAMBUNG',
    disconnected: 'TIDAK TERSAMBUNG',
    connectRtlSdr: 'Sambung RTL-SDR (WebUSB)',
    connectLineIn: 'Sambung Audio Jack / Line-In',
    useTestSignal: 'Gunakan Isyarat Ujian IQ',
    sampleRate: 'Kadar Sampel',
    rfGain: 'Gandaan RF',
    rfGainAuto: 'Gandaan Auto (AGC)',
    ppmCorrection: 'Pembetulan PPM',
    signalStrength: 'Kekuatan Isyarat (S-Meter)',
    snr: 'Nisbah Isyarat ke Hingar (SNR)',
    squelch: 'Squelch Ambang',
    agc: 'AGC Audio',
    noiseBlanker: 'Pengurangan Hingar',
    stereo: 'Stereo',
    mono: 'Mono',
    // Spectrum
    spectrumTitle: 'Penganalisis Spektrum RF',
    waterfallTitle: 'Paparan Air Terjun (Waterfall)',
    fftSize: 'Saiz FFT',
    averaging: 'Purata Spektrum',
    centerFreq: 'Frekuensi Tengah',
    span: 'Rentang Rentasan (Span)',
    // Presets
    presetsTitle: 'Pengurus Stesen & Pratetap',
    addPreset: 'Tambah Stesen',
    deletePreset: 'Padam',
    exportJson: 'Eksport JSON',
    importJson: 'Import JSON',
    stationName: 'Nama Stesen',
    category: 'Kategori',
    // Recordings
    recordingsTitle: 'Rakaman Audio (PCM WAV)',
    noRecordings: 'Tiada rakaman audio lagi. Tekan RAKAM untuk memulakan.',
    downloadWav: 'Muat Turun .WAV',
    duration: 'Tempoh',
    // Tests
    testsTitle: 'Ujian Pengesahan DSP & Perkakasan',
    runTests: 'Jalankan Ujian Automatik',
    testPassed: 'LULUS',
    testFailed: 'GAGAL',
    // Notes
    audioJackNotice: 'PERHATIAN: Bicu audio 3.5mm ialah antara muka input analog audio, bukan antena RF atau penala frekuensi radio terus.',
    hardwareNote: 'Sokongan perkakasan sebenar: RTL-SDR Blog V3 / V4 (WebUSB) & Bicu Audio Analog.',
    xrReminder: 'Aplikasi XR ini paling baik dialami pada peranti Android XR seperti Galaxy XR atau XREAL AURA. Pada komputer meja, kami menyediakan persekitaran simulasi untuk pratonton aplikasi.',
  },
  en: {
    appTitle: 'SMART RADIO TUNER PROFESSIONAL',
    appSubtitle: 'Multi-Band Radio Receiver & SDR Workstation',
    tagline: 'Real Digital Signal Processing (DSP) & RTL-SDR Hardware Interface',
    langSelect: 'Language',
    // Bands
    bandFm: 'FM Broadcast',
    bandAm: 'AM / Medium Wave',
    bandSw: 'Shortwave (HF)',
    bandLineIn: 'Analog Audio Jack (3.5mm)',
    bandFmDesc: '87.5 MHz – 108.0 MHz (WFM)',
    bandAmDesc: '530 kHz – 1710 kHz (AM)',
    bandSwDesc: '1.7 MHz – 30.0 MHz (AM / SSB / CW)',
    bandLineInDesc: 'Real Analog Audio monitoring via 3.5mm jack or Line-In',
    // Controls
    play: 'START',
    stop: 'STOP',
    mute: 'MUTE',
    unmute: 'UNMUTE',
    volume: 'Volume',
    tuneUp: 'TUNE UP',
    tuneDown: 'TUNE DOWN',
    seekUp: 'SEEK UP',
    seekDown: 'SEEK DOWN',
    autoScan: 'AUTO SCAN',
    stopScan: 'STOP SCAN',
    record: 'RECORD WAV',
    stopRecord: 'STOP RECORD',
    savePreset: 'SAVE PRESET',
    stepSize: 'Frequency Step',
    bandwidth: 'IF Bandwidth',
    // Modes
    mode: 'Demodulation Mode',
    modeWfm: 'WFM (Wide FM)',
    modeNfm: 'NFM (Narrow FM)',
    modeAm: 'AM (Amplitude)',
    modeUsb: 'USB (Upper Sideband)',
    modeLsb: 'LSB (Lower Sideband)',
    modeCw: 'CW (Morse Code)',
    // Hardware & Signal
    hardwareTitle: 'SDR Hardware Status',
    deviceStatus: 'Device Status',
    connected: 'CONNECTED',
    disconnected: 'DISCONNECTED',
    connectRtlSdr: 'Connect RTL-SDR (WebUSB)',
    connectLineIn: 'Connect Audio Jack / Line-In',
    useTestSignal: 'Use IQ Test Signal Bench',
    sampleRate: 'Sample Rate',
    rfGain: 'RF Gain',
    rfGainAuto: 'Auto Gain (AGC)',
    ppmCorrection: 'PPM Correction',
    signalStrength: 'Signal Strength (S-Meter)',
    snr: 'Signal-to-Noise Ratio (SNR)',
    squelch: 'Squelch Threshold',
    agc: 'Audio AGC',
    noiseBlanker: 'Noise Blanker',
    stereo: 'Stereo',
    mono: 'Mono',
    // Spectrum
    spectrumTitle: 'RF Spectrum Analyzer',
    waterfallTitle: 'Waterfall Display',
    fftSize: 'FFT Size',
    averaging: 'Spectrum Averaging',
    centerFreq: 'Center Frequency',
    span: 'Frequency Span',
    // Presets
    presetsTitle: 'Station Manager & Presets',
    addPreset: 'Add Station',
    deletePreset: 'Delete',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    stationName: 'Station Name',
    category: 'Category',
    // Recordings
    recordingsTitle: 'Audio Recordings (PCM WAV)',
    noRecordings: 'No audio recordings yet. Press RECORD to start.',
    downloadWav: 'Download .WAV',
    duration: 'Duration',
    // Tests
    testsTitle: 'DSP & Hardware Verification Tests',
    runTests: 'Run Automated Tests',
    testPassed: 'PASSED',
    testFailed: 'FAILED',
    // Notes
    audioJackNotice: 'NOTE: The 3.5mm audio jack is an analog audio input interface, not an RF antenna or direct RF tuner.',
    hardwareNote: 'Real hardware support: RTL-SDR Blog V3 / V4 (WebUSB) & Analog Audio Jack.',
    xrReminder: 'The XR app is best viewed in an Android XR device like Galaxy XR or XREAL AURA. On desktop, we provide you a simulated environment for previewing the app.',
  },
};
