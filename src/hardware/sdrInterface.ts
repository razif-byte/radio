import { HardwareStatus, HardwareDeviceType } from '../types.js';

export type IqSampleCallback = (iSamples: Float32Array, qSamples: Float32Array, sampleRate: number) => void;

export interface ISdrDevice {
  readonly deviceType: HardwareDeviceType;
  readonly name: string;
  readonly isConnected: boolean;
  readonly isStreaming: boolean;

  open(): Promise<boolean>;
  close(): Promise<void>;
  startStreaming(callback: IqSampleCallback): Promise<void>;
  stopStreaming(): Promise<void>;

  setCenterFrequency(frequencyHz: number): Promise<void>;
  setSampleRate(sampleRateHz: number): Promise<void>;
  setTunerGain(gainDb: number, autoGain: boolean): Promise<void>;
  setPpmCorrection(ppm: number): Promise<void>;

  getStatus(): HardwareStatus;
}
