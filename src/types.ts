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

export type HardwareDeviceType = 'RTL_SDR_USB' | 'AIRSPY_SDR_USB' | 'AUDIO_LINE_IN' | 'IQ_TEST_BENCH';

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

  // Advanced DSP Filters
  anrEnabled: boolean; // Adaptive Noise Reduction (LMS filter)
  anrLevel: number; // 1 to 10
  notchEnabled: boolean; // Configurable Notch Filter
  notchFreqHz: number; // Notch target frequency in Hz (e.g. 1000 Hz tone or 50/60 Hz hum)
  notchQ: number; // Notch Q-factor (e.g. 5 to 50)
  bpfQ: number; // Bandpass filter Q-factor (e.g. 0.7 to 10)

  // Wireless Mic & Audio Jack Preamp
  wirelessMicBoostDb: number; // Preamp boost for wireless mic receiver (0 to 24 dB)
  wirelessMicRumbleFilter: boolean; // 80 Hz highpass cut for wireless mic handling rumble
  selectedAudioDeviceId: string;

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
