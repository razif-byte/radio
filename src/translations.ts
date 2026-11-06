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
  connectAirspy: string;
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
  // Advanced DSP Filters
  advancedFiltersTitle: string;
  anrTitle: string;
  anrDesc: string;
  notchTitle: string;
  notchFreq: string;
  qFactor: string;
  bpfTitle: string;
  wirelessMicTitle: string;
  wirelessMicDesc: string;
  micPreampBoost: string;
  rumbleFilter: string;
  audioDeviceSelect: string;
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
    tagline: 'Pemprosesan Isyarat Digital Sebenar (DSP) & Antara Muka Perkakasan RTL-SDR / Airspy',
    langSelect: 'Bahasa',
    // Bands
    bandFm: 'FM Siaran',
    bandAm: 'AM / Gelombang Sederhana',
    bandSw: 'Gelombang Pendek (HF)',
    bandLineIn: 'Input Audio Analog (3.5mm)',
    bandFmDesc: '87.5 MHz – 108.0 MHz (WFM)',
    bandAmDesc: '530 kHz – 1710 kHz (AM)',
    bandSwDesc: '1.7 MHz – 30.0 MHz (AM / SSB / CW)',
    bandLineInDesc: 'Penerima Mic Tanpa Wayar & Pemantauan Audio 3.5mm Sebenar',
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
    connectAirspy: 'Sambung Airspy SDR (WebUSB)',
    connectLineIn: 'Sambung Audio Jack / Wireless Mic',
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
    // Advanced DSP Filters
    advancedFiltersTitle: 'Penapisan Digital Lanjutan (DSP)',
    anrTitle: 'Pengurangan Hingar Adaptif (ANR)',
    anrDesc: 'Penapis LMS pintar bagi memadamkan statik latar & desisan',
    notchTitle: 'Penapis Takuk (Notch Filter)',
    notchFreq: 'Frekuensi Takuk (Hz)',
    qFactor: 'Ketajaman / Faktor Q',
    bpfTitle: 'Penapis Jalur Lepas (Bandpass Q)',
    wirelessMicTitle: 'Penerima Mic Tanpa Wayar (Wireless Mic)',
    wirelessMicDesc: 'Penerimaan isyarat audio dari receiver mic tanpa wayar melalui bicu 3.5mm',
    micPreampBoost: 'Gandaan Preamp Mic',
    rumbleFilter: 'Potongan Gegaran 80Hz (Rumble Cut)',
    audioDeviceSelect: 'Pilih Sumber Input Audio',
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
    audioJackNotice: 'PERHATIAN: Bicu audio 3.5mm ialah antara muka input analog audio untuk penerima mic tanpa wayar / radio luar, bukan penala frekuensi radio terus.',
    hardwareNote: 'Sokongan perkakasan sebenar: RTL-SDR Blog V3/V4 & Airspy R2/Mini/HF+ (WebUSB) & Bicu Audio Wireless Mic.',
    xrReminder: 'Aplikasi XR ini paling baik dialami pada peranti Android XR seperti Galaxy XR atau XREAL AURA. Pada komputer meja, kami menyediakan persekitaran simulasi untuk pratonton aplikasi.',
  },
  en: {
    appTitle: 'SMART RADIO TUNER PROFESSIONAL',
    appSubtitle: 'Multi-Band Radio Receiver & SDR Workstation',
    tagline: 'Real Digital Signal Processing (DSP) & RTL-SDR / Airspy Hardware Interface',
    langSelect: 'Language',
    // Bands
    bandFm: 'FM Broadcast',
    bandAm: 'AM / Medium Wave',
    bandSw: 'Shortwave (HF)',
    bandLineIn: 'Analog Audio Jack (3.5mm)',
    bandFmDesc: '87.5 MHz – 108.0 MHz (WFM)',
    bandAmDesc: '530 kHz – 1710 kHz (AM)',
    bandSwDesc: '1.7 MHz – 30.0 MHz (AM / SSB / CW)',
    bandLineInDesc: 'Wireless Mic Receiver & 3.5mm Real Audio Monitoring',
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
    connectAirspy: 'Connect Airspy SDR (WebUSB)',
    connectLineIn: 'Connect Audio Jack / Wireless Mic',
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
    // Advanced DSP Filters
    advancedFiltersTitle: 'Advanced Digital Filtering (DSP)',
    anrTitle: 'Adaptive Noise Reduction (ANR)',
    anrDesc: 'Smart LMS adaptive filter to cancel background static and hiss',
    notchTitle: 'Notch Filter',
    notchFreq: 'Notch Frequency (Hz)',
    qFactor: 'Selectivity / Q-Factor',
    bpfTitle: 'Bandpass Filter Q',
    wirelessMicTitle: 'Wireless Mic Receiver Input',
    wirelessMicDesc: 'Receives analog audio feed from wireless mic receiver via 3.5mm jack',
    micPreampBoost: 'Mic Preamp Boost',
    rumbleFilter: 'Rumble Cut Filter (80Hz)',
    audioDeviceSelect: 'Select Audio Input Source',
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
    audioJackNotice: 'NOTE: The 3.5mm audio jack is an analog audio input interface for wireless mic receivers or external radios, not a direct RF tuner.',
    hardwareNote: 'Real hardware support: RTL-SDR Blog V3/V4, Airspy R2/Mini/HF+ (WebUSB) & Wireless Mic Audio Jack.',
    xrReminder: 'The XR app is best viewed in an Android XR device like Galaxy XR or XREAL AURA. On desktop, we provide you a simulated environment for previewing the app.',
  },
};
