export type RadioBand = 'FM' | 'AM' | 'SW' | 'LINE_IN';

export type DemodulationMode = 'WFM' | 'NFM' | 'AM' | 'USB' | 'LSB' | 'CW';

export type Language = 'ms' | 'en'; // ms = Bahasa Melayu (default), en = English

export interface BandConfig {
  id: RadioBand;
  name: string;
  minFreqHz: number;
  maxFreqHz: number;
  defaultFreqHz: number;
  defaultMode: DemodulationMode;
  supportedModes: DemodulationMode[];
  defaultStepHz: number;
  stepsHz: number[];
  bandwidthOptionsHz: number[];
  defaultBandwidthHz: number;
}

export interface RadioPreset {
  id: string;
  name: string;
  frequencyHz: number;
  band: RadioBand;
  mode: DemodulationMode;
  category: 'FM Broadcast' | 'AM Broadcast' | 'Shortwave' | 'Amateur Radio' | 'Time & Utility';
  location?: string;
  notes?: string;
}

export type HardwareDeviceType = 'RTL_SDR_USB' | 'AUDIO_LINE_IN' | 'IQ_TEST_BENCH';

export interface HardwareStatus {
  connected: boolean;
  deviceType: HardwareDeviceType;
  deviceName: string;
  sampleRateHz: number;
  tunerGainDb: number;
  rfGainAuto: boolean;
  ppmCorrection: number;
  isStreaming: boolean;
  error?: string;
}

export interface ReceiverState {
  frequencyHz: number;
  band: RadioBand;
  mode: DemodulationMode;
  stepHz: number;
  bandwidthHz: number;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  squelchDb: number; // -100 to 0 dBFS
  squelchOpen: boolean;
  rfGainDb: number; // 0 to 50 dB
  rfGainAuto: boolean;
  agcEnabled: boolean;
  noiseBlanker: boolean;
  stereoMode: boolean;
  audioFilterLowHz: number;
  audioFilterHighHz: number;
  signalStrengthDbm: number;
  snrDb: number;
  sMeterValue: number; // 0 to 9, plus +10, +20, +30 dB
  isPlaying: boolean;
  isScanning: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  language: Language;
}

export interface AudioRecordingItem {
  id: string;
  timestamp: Date;
  frequencyHz: number;
  band: RadioBand;
  mode: DemodulationMode;
  durationSeconds: number;
  blob: Blob;
  url: string;
  fileName: string;
  sizeBytes: number;
}

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: string;
}
