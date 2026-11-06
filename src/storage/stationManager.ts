import { BandConfig, RadioBand, RadioPreset } from '../types.js';

export const BAND_CONFIGS: Record<RadioBand, BandConfig> = {
  FM: {
    id: 'FM',
    name: 'FM Broadcast',
    minFreqHz: 87_500_000,
    maxFreqHz: 108_000_000,
    defaultFreqHz: 88_500_000,
    defaultMode: 'WFM',
    supportedModes: ['WFM', 'NFM'],
    defaultStepHz: 100_000, // 100 kHz
    stepsHz: [50_000, 100_000, 200_000],
    bandwidthOptionsHz: [120_000, 150_000, 200_000, 250_000],
    defaultBandwidthHz: 200_000,
  },
  AM: {
    id: 'AM',
    name: 'AM / Medium Wave',
    minFreqHz: 530_000,
    maxFreqHz: 1_710_000,
    defaultFreqHz: 684_000,
    defaultMode: 'AM',
    supportedModes: ['AM', 'USB', 'LSB'],
    defaultStepHz: 9_000, // 9 kHz ITU Region 3 / 10 kHz Americas
    stepsHz: [1_000, 5_000, 9_000, 10_000],
    bandwidthOptionsHz: [4_000, 6_000, 9_000, 10_000],
    defaultBandwidthHz: 9_000,
  },
  SW: {
    id: 'SW',
    name: 'Shortwave / HF',
    minFreqHz: 1_700_000,
    maxFreqHz: 30_000_000,
    defaultFreqHz: 7_100_000,
    defaultMode: 'LSB',
    supportedModes: ['AM', 'USB', 'LSB', 'CW', 'NFM'],
    defaultStepHz: 1_000, // 1 kHz
    stepsHz: [10, 100, 500, 1_000, 5_000],
    bandwidthOptionsHz: [500, 1_800, 2_400, 3_000, 6_000],
    defaultBandwidthHz: 2_400,
  },
  LINE_IN: {
    id: 'LINE_IN',
    name: 'Analog Audio Jack (3.5mm)',
    minFreqHz: 20,
    maxFreqHz: 20_000,
    defaultFreqHz: 1_000,
    defaultMode: 'AM',
    supportedModes: ['AM'],
    defaultStepHz: 100,
    stepsHz: [10, 50, 100],
    bandwidthOptionsHz: [20_000],
    defaultBandwidthHz: 20_000,
  },
};

export const DEFAULT_PRESETS: RadioPreset[] = [
  // FM Broadcast
  {
    id: 'p1',
    name: 'Nasional FM',
    frequencyHz: 88_500_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Kuala Lumpur / Malaysia',
    notes: 'RTM Berita & Muzik Nasional',
  },
  {
    id: 'p2',
    name: 'Radio Klasik',
    frequencyHz: 87_700_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Malaysia',
    notes: 'Lagu Klasik & Tradisional',
  },
  {
    id: 'p3',
    name: 'Ai FM',
    frequencyHz: 89_300_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Kuala Lumpur',
    notes: 'Saluran Bahasa Mandarin RTM',
  },
  {
    id: 'p4',
    name: 'Hitz FM',
    frequencyHz: 92_900_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Klang Valley',
    notes: 'Top 40 Pop Music',
  },
  {
    id: 'p5',
    name: 'Sinar FM',
    frequencyHz: 96_700_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Malaysia',
    notes: 'Muzik Retro & Santai',
  },
  {
    id: 'p6',
    name: 'Lite FM',
    frequencyHz: 105_700_000,
    band: 'FM',
    mode: 'WFM',
    category: 'FM Broadcast',
    location: 'Malaysia',
    notes: 'Easy Listening & Classic Hits',
  },
  // AM Broadcast
  {
    id: 'p7',
    name: 'RTM MW 576 kHz',
    frequencyHz: 576_000,
    band: 'AM',
    mode: 'AM',
    category: 'AM Broadcast',
    location: 'Kuala Lumpur',
    notes: 'Medium Wave Regional Transmitter',
  },
  {
    id: 'p8',
    name: 'RTM MW 684 kHz',
    frequencyHz: 684_000,
    band: 'AM',
    mode: 'AM',
    category: 'AM Broadcast',
    location: 'Sungai Besi',
    notes: 'Medium Wave Broadcast',
  },
  // Shortwave Broadcast & Ham Radio
  {
    id: 'p9',
    name: 'HAM 40m Calling Frequency',
    frequencyHz: 7_100_000,
    band: 'SW',
    mode: 'LSB',
    category: 'Amateur Radio',
    location: 'Worldwide 40-Meter Band',
    notes: 'Amateur Radio 40m voice LSB',
  },
  {
    id: 'p10',
    name: 'HAM 40m CW Telegraphy',
    frequencyHz: 7_030_000,
    band: 'SW',
    mode: 'CW',
    category: 'Amateur Radio',
    location: 'International CW Calling',
    notes: 'QRP CW Calling Frequency',
  },
  {
    id: 'p11',
    name: 'BBC World Service SW',
    frequencyHz: 11_835_000,
    band: 'SW',
    mode: 'AM',
    category: 'Shortwave',
    location: 'UK / Asia Relay',
    notes: 'Shortwave 25m band news',
  },
  {
    id: 'p12',
    name: 'HAM 20m International Calling',
    frequencyHz: 14_200_000,
    band: 'SW',
    mode: 'USB',
    category: 'Amateur Radio',
    location: 'Worldwide 20-Meter Band',
    notes: 'Primary 20m DX USB Calling',
  },
  {
    id: 'p13',
    name: 'Voice of America SW',
    frequencyHz: 15_400_000,
    band: 'SW',
    mode: 'AM',
    category: 'Shortwave',
    location: 'Philippines / Pacific Relay',
    notes: 'Shortwave 19m band international',
  },
];

export class StationManager {
  private presets: RadioPreset[] = [];

  constructor() {
    this.loadPresets();
  }

  getPresets(): RadioPreset[] {
    return [...this.presets];
  }

  getPresetsForBand(band: RadioBand): RadioPreset[] {
    return this.presets.filter((p) => p.band === band);
  }

  addPreset(preset: Omit<RadioPreset, 'id'>): RadioPreset {
    const newPreset: RadioPreset = {
      ...preset,
      id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    };
    this.presets.push(newPreset);
    this.savePresets();
    return newPreset;
  }

  removePreset(id: string): void {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.savePresets();
  }

  exportToJson(): string {
    return JSON.stringify(this.presets, null, 2);
  }

  importFromJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data)) {
        this.presets = data;
        this.savePresets();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private loadPresets(): void {
    try {
      const saved = localStorage.getItem('smart_radio_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.presets = parsed;
          return;
        }
      }
    } catch {
      // Fall back to default
    }
    this.presets = [...DEFAULT_PRESETS];
  }

  private savePresets(): void {
    try {
      localStorage.setItem('smart_radio_presets', JSON.stringify(this.presets));
    } catch {
      // Ignore storage errors
    }
  }
}
