import { HardwareStatus, HardwareDeviceType } from '../types.js';

export type AnalogAudioCallback = (samples: Float32Array) => void;

/**
 * Analog Audio Input (3.5mm Line-In / Wireless Mic Receiver) Handler.
 * Supports receiving from external wireless mic receiver audio jacks, line-in feeds, and soundcards.
 */
export class AudioJackDevice {
  readonly deviceType: HardwareDeviceType = 'AUDIO_LINE_IN';
  readonly name: string = 'Penerima Mic Tanpa Wayar / Line-In 3.5mm';

  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isStreaming = false;
  private sampleCallback: AnalogAudioCallback | null = null;
  private lastError?: string;
  private activeDeviceId?: string;

  get isConnected(): boolean {
    return this.mediaStream !== null && this.mediaStream.active;
  }

  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  async open(deviceId?: string): Promise<boolean> {
    try {
      this.activeDeviceId = deviceId;
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.lastError = undefined;
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      console.warn('[Audio Jack] Could not open wireless mic/line-in:', err);
      return false;
    }
  }

  async startStreaming(callback: AnalogAudioCallback): Promise<void> {
    if (!this.mediaStream) {
      const ok = await this.open(this.activeDeviceId);
      if (!ok) throw new Error('Cannot access analog audio jack: ' + this.lastError);
    }

    this.sampleCallback = callback;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream!);
    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isStreaming || !this.sampleCallback) return;
      const input = event.inputBuffer.getChannelData(0);
      this.sampleCallback(input);
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    this.isStreaming = true;
  }

  async stopStreaming(): Promise<void> {
    this.isStreaming = false;
    this.sampleCallback = null;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  async close(): Promise<void> {
    await this.stopStreaming();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  getStatus(): HardwareStatus {
    return {
      connected: this.isConnected,
      deviceType: this.deviceType,
      deviceName: this.name,
      sampleRateHz: this.audioContext?.sampleRate ?? 48000,
      tunerGainDb: 0,
      rfGainAuto: false,
      ppmCorrection: 0,
      isStreaming: this.isStreaming,
      error: this.lastError,
    };
  }
}
