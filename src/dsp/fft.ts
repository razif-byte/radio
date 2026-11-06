/**
 * Cooley-Tukey Radix-2 Complex FFT Implementation.
 * Optimized for real-time SDR RF spectrum & waterfall computation.
 */

export type WindowType = 'none' | 'hamming' | 'blackman' | 'hanning';

export class ComplexFft {
  readonly size: number;
  private readonly bitReverseTable: Uint32Array;
  private readonly cosTable: Float32Array;
  private readonly sinTable: Float32Array;
  private readonly window: Float32Array;

  constructor(size: number = 1024, windowType: WindowType = 'blackman') {
    if ((size & (size - 1)) !== 0) {
      throw new Error(`FFT size must be a power of 2, received ${size}`);
    }
    this.size = size;

    // Bit reversal precomputation
    this.bitReverseTable = new Uint32Array(size);
    const levels = 31 - Math.clz32(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      for (let j = 0; j < levels; j++) {
        rev = (rev << 1) | ((i >> j) & 1);
      }
      this.bitReverseTable[i] = rev;
    }

    // Trigonometric twiddle factors
    const halfSize = size / 2;
    this.cosTable = new Float32Array(halfSize);
    this.sinTable = new Float32Array(halfSize);
    for (let i = 0; i < halfSize; i++) {
      const angle = (-2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Window coefficients
    this.window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      if (windowType === 'hamming') {
        this.window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
      } else if (windowType === 'hanning') {
        this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
      } else if (windowType === 'blackman') {
        this.window[i] =
          0.42 -
          0.5 * Math.cos((2 * Math.PI * i) / (size - 1)) +
          0.08 * Math.cos((4 * Math.PI * i) / (size - 1));
      } else {
        this.window[i] = 1.0;
      }
    }
  }

  /**
   * Computes In-Place Complex FFT.
   * @param real In-phase (I) array of length `this.size`
   * @param imag Quadrature (Q) array of length `this.size`
   */
  transform(real: Float32Array, imag: Float32Array): void {
    const n = this.size;

    // Apply window & bit reversal
    for (let i = 0; i < n; i++) {
      real[i] *= this.window[i];
      imag[i] *= this.window[i];
    }

    for (let i = 0; i < n; i++) {
      const j = this.bitReverseTable[i];
      if (i < j) {
        const tempR = real[i];
        const tempI = imag[i];
        real[i] = real[j];
        imag[i] = imag[j];
        real[j] = tempR;
        imag[j] = tempI;
      }
    }

    // Cooley-Tukey iterative computation
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const tableIdx = j * step;
          const uR = real[i + j];
          const uI = imag[i + j];

          const cosVal = this.cosTable[tableIdx];
          const sinVal = this.sinTable[tableIdx];
          const vR = real[i + j + halfLen] * cosVal - imag[i + j + halfLen] * sinVal;
          const vI = real[i + j + halfLen] * sinVal + imag[i + j + halfLen] * cosVal;

          real[i + j] = uR + vR;
          imag[i + j] = uI + vI;
          real[i + j + halfLen] = uR - vR;
          imag[i + j + halfLen] = uI - vI;
        }
      }
    }
  }

  /**
   * Computes FFT and outputs centered power spectrum in decibels (dBm / dBFS).
   * FFTShift is applied so that 0 Hz (center frequency) is in the middle of the array.
   */
  calculatePowerSpectrum(
    real: Float32Array,
    imag: Float32Array,
    outputDb: Float32Array,
    noiseFloorDbm: number = -110
  ): void {
    this.transform(real, imag);
    const n = this.size;
    const half = n / 2;

    for (let i = 0; i < n; i++) {
      // FFT Shift: shift DC to center
      const shiftedIdx = (i + half) % n;
      const r = real[shiftedIdx];
      const im = imag[shiftedIdx];
      const magSq = (r * r + im * im) / (n * n);
      const db = 10 * Math.log10(Math.max(magSq, 1e-13)) + noiseFloorDbm + 120;
      outputDb[i] = db;
    }
  }
}
