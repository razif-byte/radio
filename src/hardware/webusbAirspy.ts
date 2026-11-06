import { ISdrDevice, IqSampleCallback } from './sdrInterface.js';
import { HardwareStatus, HardwareDeviceType } from '../types.js';

/**
 * Real WebUSB Airspy SDR Hardware Driver.
 * Direct WebUSB implementation for Airspy R2, Airspy Mini, and Airspy HF+ Discovery.
 */

export const AIRSPY_USB_VENDOR_ID = 0x1d50;
export const AIRSPY_PRODUCT_IDS = {
  AIRSPY_ONE_MINI_R2: 0x60a1,
  AIRSPY_HF_PLUS: 0x60a7,
};

// Airspy USB command IDs
export enum AirspyCommand {
  RECEIVER_MODE = 1,
  SET_FREQ = 2,
  SET_SAMPLE_RATE = 3,
  SET_LNA_GAIN = 14,
  SET_MIXER_GAIN = 12,
  SET_VGA_GAIN = 13,
  SET_PACKING = 18,
}

export class WebUsbAirspyDevice implements ISdrDevice {
  readonly deviceType: HardwareDeviceType = 'AIRSPY_SDR_USB';
  readonly name: string = 'Airspy SDR R2/Mini/HF+ (WebUSB)';

  private usbDevice: USBDevice | null = null;
  private streaming = false;
  private sampleCallback: IqSampleCallback | null = null;

  private centerFreqHz = 100_000_000;
  private sampleRateHz = 2_500_000; // 2.5 MSPS default for Airspy
  private gainDb = 28.0;
  private autoGain = true;
  private ppmCorrection = 0;
  private lastError?: string;

  get isConnected(): boolean {
    return this.usbDevice !== null && this.usbDevice.opened;
  }

  get isStreaming(): boolean {
    return this.streaming;
  }

  async open(): Promise<boolean> {
    const usb = (navigator as any).usb as USB | undefined;
    if (!usb) {
      this.lastError = 'WebUSB API is not supported in this browser. Please use Chrome, Edge, or an Android XR browser.';
      console.warn(this.lastError);
      return false;
    }

    try {
      this.usbDevice = await usb.requestDevice({
        filters: [
          { vendorId: AIRSPY_USB_VENDOR_ID, productId: AIRSPY_PRODUCT_IDS.AIRSPY_ONE_MINI_R2 },
          { vendorId: AIRSPY_USB_VENDOR_ID, productId: AIRSPY_PRODUCT_IDS.AIRSPY_HF_PLUS },
          { vendorId: AIRSPY_USB_VENDOR_ID }, // Any OpenMoko/Airspy device
        ],
      });

      await this.usbDevice.open();
      if (this.usbDevice.configuration === null) {
        await this.usbDevice.selectConfiguration(1);
      }
      await this.usbDevice.claimInterface(0);

      // Listen for USB disconnects
      usb.addEventListener('disconnect', (event: any) => {
        if (event.device === this.usbDevice) {
          console.warn('[Airspy] Device disconnected.');
          void this.close();
        }
      });

      // Initialize Airspy hardware registers
      await this.initAirspy();
      await this.setSampleRate(this.sampleRateHz);
      await this.setCenterFrequency(this.centerFreqHz);
      await this.setTunerGain(this.gainDb, this.autoGain);

      this.lastError = undefined;
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      console.error('[Airspy] Failed to open device:', err);
      return false;
    }
  }

  async close(): Promise<void> {
    this.streaming = false;
    if (this.usbDevice && this.usbDevice.opened) {
      try {
        await this.sendCommand(AirspyCommand.RECEIVER_MODE, 0); // Stop receiver
        await this.usbDevice.releaseInterface(0);
        await this.usbDevice.close();
      } catch (err) {
        console.warn('[Airspy] Error closing device:', err);
      }
    }
    this.usbDevice = null;
  }

  async startStreaming(callback: IqSampleCallback): Promise<void> {
    if (!this.isConnected || !this.usbDevice) {
      throw new Error('Airspy device not connected');
    }
    this.sampleCallback = callback;
    this.streaming = true;

    // Enable receiver stream command
    await this.sendCommand(AirspyCommand.RECEIVER_MODE, 1);

    // Start bulk read loop
    void this.readBulkLoop();
  }

  async stopStreaming(): Promise<void> {
    this.streaming = false;
    this.sampleCallback = null;
    if (this.usbDevice && this.usbDevice.opened) {
      try {
        await this.sendCommand(AirspyCommand.RECEIVER_MODE, 0);
      } catch {
        // Ignore
      }
    }
  }

  private async readBulkLoop(): Promise<void> {
    const transferSize = 16384; // 8192 int16 samples
    const numPairs = transferSize / 4; // Each IQ pair is 2x 16-bit ints (4 bytes)
    const iBuf = new Float32Array(numPairs);
    const qBuf = new Float32Array(numPairs);

    while (this.streaming && this.usbDevice && this.usbDevice.opened) {
      try {
        // Endpoint 1 is standard for Airspy IQ bulk stream
        const result = await this.usbDevice.transferIn(1, transferSize);
        if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
          const view = result.data;
          const availablePairs = Math.floor(view.byteLength / 4);

          for (let k = 0; k < availablePairs; k++) {
            // Airspy delivers signed 16-bit little-endian samples
            const rawI = view.getInt16(k * 4, true);
            const rawQ = view.getInt16(k * 4 + 2, true);

            iBuf[k] = rawI / 32768.0;
            qBuf[k] = rawQ / 32768.0;
          }

          if (this.sampleCallback) {
            this.sampleCallback(iBuf.subarray(0, availablePairs), qBuf.subarray(0, availablePairs), this.sampleRateHz);
          }
        }
      } catch (err) {
        if (this.streaming) {
          console.warn('[Airspy] Bulk read error:', err);
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    }
  }

  private async initAirspy(): Promise<void> {
    if (!this.usbDevice) return;
    try {
      // Disable packing (standard 16-bit unpacked IQ)
      await this.sendCommand(AirspyCommand.SET_PACKING, 0);
    } catch {
      // Ignore
    }
  }

  private async sendCommand(cmd: AirspyCommand, value: number, index: number = 0, data?: Uint8Array): Promise<void> {
    if (!this.usbDevice) return;
    await this.usbDevice.controlTransferOut(
      {
        requestType: 'vendor',
        recipient: 'device',
        request: cmd,
        value,
        index,
      },
      data
    );
  }

  async setCenterFrequency(frequencyHz: number): Promise<void> {
    this.centerFreqHz = frequencyHz;
    if (!this.usbDevice) return;

    // Send 32-bit frequency in little-endian format
    const buf = new Uint8Array(4);
    const view = new DataView(buf.buffer);
    view.setUint32(0, frequencyHz, true);

    try {
      await this.usbDevice.controlTransferOut(
        {
          requestType: 'vendor',
          recipient: 'device',
          request: AirspyCommand.SET_FREQ,
          value: 0,
          index: 0,
        },
        buf
      );
      console.log(`[Airspy] Tuned center frequency to ${(frequencyHz / 1e6).toFixed(3)} MHz`);
    } catch (err) {
      console.warn('[Airspy] Could not set frequency:', err);
    }
  }

  async setSampleRate(sampleRateHz: number): Promise<void> {
    this.sampleRateHz = sampleRateHz;
    if (!this.usbDevice) return;
    // 0 = 10 MSPS, 1 = 2.5 MSPS on R2
    const rateIndex = sampleRateHz >= 5_000_000 ? 0 : 1;
    try {
      await this.sendCommand(AirspyCommand.SET_SAMPLE_RATE, 0, rateIndex);
      console.log(`[Airspy] Set sample rate to ${(sampleRateHz / 1e6).toFixed(3)} MSPS`);
    } catch (err) {
      console.warn('[Airspy] Could not set sample rate:', err);
    }
  }

  async setTunerGain(gainDb: number, autoGain: boolean): Promise<void> {
    this.gainDb = gainDb;
    this.autoGain = autoGain;
    if (!this.usbDevice) return;

    // Map 0-50 dB to Airspy LNA (0-14), Mixer (0-15), VGA (0-15)
    const lna = autoGain ? 8 : Math.min(14, Math.floor((gainDb / 50) * 14));
    const mixer = autoGain ? 8 : Math.min(15, Math.floor((gainDb / 50) * 15));
    const vga = autoGain ? 6 : Math.min(15, Math.floor((gainDb / 50) * 15));

    try {
      await this.sendCommand(AirspyCommand.SET_LNA_GAIN, 0, lna);
      await this.sendCommand(AirspyCommand.SET_MIXER_GAIN, 0, mixer);
      await this.sendCommand(AirspyCommand.SET_VGA_GAIN, 0, vga);
      console.log(`[Airspy] Set gains -> LNA: ${lna}, Mixer: ${mixer}, VGA: ${vga}`);
    } catch (err) {
      console.warn('[Airspy] Could not set tuner gain:', err);
    }
  }

  async setPpmCorrection(ppm: number): Promise<void> {
    this.ppmCorrection = ppm;
  }

  getStatus(): HardwareStatus {
    return {
      connected: this.isConnected,
      deviceType: this.deviceType,
      deviceName: this.name,
      sampleRateHz: this.sampleRateHz,
      tunerGainDb: this.gainDb,
      rfGainAuto: this.autoGain,
      ppmCorrection: this.ppmCorrection,
      isStreaming: this.streaming,
      error: this.lastError,
    };
  }
}
