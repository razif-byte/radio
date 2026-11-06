/**
 * Real-time RF Spectrum Analyzer & Waterfall Canvas Renderer.
 * High-performance 60 FPS 2D canvas drawing used for both desktop HUD and 3D WebXR texture.
 */

export class SpectrumRenderer {
  public spectrumCanvas: HTMLCanvasElement;
  public waterfallCanvas: HTMLCanvasElement;
  private specCtx: CanvasRenderingContext2D;
  private wfCtx: CanvasRenderingContext2D;

  private width = 640;
  private height = 180;
  private wfHeight = 140;

  // Waterfall memory buffer
  private wfOffscreenCanvas: HTMLCanvasElement;
  private wfOffscreenCtx: CanvasRenderingContext2D;

  // Peak tracking
  public peakFreqOffsetHz = 0;
  public peakPowerDbm = -120;

  constructor(width: number = 640, height: number = 180, wfHeight: number = 140) {
    this.width = width;
    this.height = height;
    this.wfHeight = wfHeight;

    this.spectrumCanvas = document.createElement('canvas');
    this.spectrumCanvas.width = width;
    this.spectrumCanvas.height = height;
    this.specCtx = this.spectrumCanvas.getContext('2d')!;

    this.waterfallCanvas = document.createElement('canvas');
    this.waterfallCanvas.width = width;
    this.waterfallCanvas.height = wfHeight;
    this.wfCtx = this.waterfallCanvas.getContext('2d')!;

    this.wfOffscreenCanvas = document.createElement('canvas');
    this.wfOffscreenCanvas.width = width;
    this.wfOffscreenCanvas.height = wfHeight;
    this.wfOffscreenCtx = this.wfOffscreenCanvas.getContext('2d')!;
    this.wfOffscreenCtx.fillStyle = '#060a12';
    this.wfOffscreenCtx.fillRect(0, 0, width, wfHeight);
  }

  /**
   * Render frame from FFT dB values.
   * @param spectrumDb Array of dBm values from DSP FFT (e.g. length 1024)
   * @param centerFreqHz Current center tuned frequency
   * @param spanHz Current sample rate / span
   * @param squelchDb Squelch threshold level in dBm
   */
  renderFrame(
    spectrumDb: Float32Array,
    centerFreqHz: number,
    spanHz: number,
    squelchDb: number = -85
  ): void {
    const w = this.width;
    const h = this.height;
    const ctx = this.specCtx;
    const len = spectrumDb.length;
    if (len === 0) return;

    // --- 1. RENDER RF SPECTRUM ---
    // Dark charcoal background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (-120 dBm to -20 dBm, 20 dB steps)
    const minDbm = -120;
    const maxDbm = -20;
    const dbRange = maxDbm - minDbm;

    ctx.strokeStyle = '#1b263b';
    ctx.lineWidth = 1;
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#4a5d78';

    for (let db = minDbm; db <= maxDbm; db += 20) {
      const y = h - ((db - minDbm) / dbRange) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillText(`${db} dBm`, 6, y - 3);
    }

    // Vertical frequency grid
    ctx.strokeStyle = '#162235';
    for (let f = 1; f < 8; f++) {
      const x = (f / 8) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Squelch line
    const squelchY = h - ((squelchDb - minDbm) / dbRange) * h;
    ctx.strokeStyle = '#ffb703';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, squelchY);
    ctx.lineTo(w, squelchY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffb703';
    ctx.fillText(`SQL ${squelchDb} dBm`, w - 85, squelchY - 3);

    // Spectrum curve & Peak Finder
    let maxVal = -200;
    let maxIdx = 0;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let i = 0; i < len; i++) {
      const db = spectrumDb[i];
      if (db > maxVal) {
        maxVal = db;
        maxIdx = i;
      }
      const x = (i / (len - 1)) * w;
      const normalized = Math.max(0, Math.min(1, (db - minDbm) / dbRange));
      const y = h - normalized * h;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Stroke the top trace
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Re-draw crisp line outline
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const db = spectrumDb[i];
      const x = (i / (len - 1)) * w;
      const y = h - Math.max(0, Math.min(1, (db - minDbm) / dbRange)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Center tuned frequency marker (red vertical needle)
    const centerX = w / 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
    ctx.stroke();

    // Peak marker triangle & text
    this.peakPowerDbm = maxVal;
    this.peakFreqOffsetHz = ((maxIdx - len / 2) / len) * spanHz;
    const peakX = (maxIdx / (len - 1)) * w;
    const peakY = h - Math.max(0, Math.min(1, (maxVal - minDbm) / dbRange)) * h;

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(peakX, peakY - 8);
    ctx.lineTo(peakX - 5, peakY - 16);
    ctx.lineTo(peakX + 5, peakY - 16);
    ctx.closePath();
    ctx.fill();

    const peakFreqMhz = ((centerFreqHz + this.peakFreqOffsetHz) / 1e6).toFixed(3);
    ctx.fillText(`${peakFreqMhz} MHz (${maxVal.toFixed(1)} dBm)`, Math.min(w - 140, Math.max(10, peakX - 60)), Math.max(20, peakY - 20));

    // --- 2. RENDER WATERFALL ---
    // Shift offscreen waterfall down by 1 row
    this.wfOffscreenCtx.drawImage(this.wfOffscreenCanvas, 0, 1);

    // Draw the latest spectrum line at y=0 on offscreen canvas
    const imgData = this.wfOffscreenCtx.createImageData(w, 1);
    const data = imgData.data;

    for (let x = 0; x < w; x++) {
      const fftIdx = Math.floor((x / w) * len);
      const db = spectrumDb[fftIdx];
      const norm = Math.max(0, Math.min(1, (db - minDbm) / dbRange));
      const [r, g, b] = this.colormap(norm);

      const p = x * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
    this.wfOffscreenCtx.putImageData(imgData, 0, 0);

    // Copy offscreen waterfall to visible waterfall canvas
    this.wfCtx.drawImage(this.wfOffscreenCanvas, 0, 0);

    // Overlay center line on waterfall
    this.wfCtx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    this.wfCtx.lineWidth = 1;
    this.wfCtx.beginPath();
    this.wfCtx.moveTo(w / 2, 0);
    this.wfCtx.lineTo(w / 2, this.wfHeight);
    this.wfCtx.stroke();
  }

  /**
   * Color intensity mapping for SDR waterfall:
   * Dark Blue -> Royal Blue -> Cyan -> Emerald Green -> Yellow -> Orange -> Crimson
   */
  private colormap(value: number): [number, number, number] {
    if (value < 0.2) {
      // Midnight Blue to Deep Navy
      const t = value / 0.2;
      return [Math.floor(10 + 15 * t), Math.floor(14 + 30 * t), Math.floor(35 + 90 * t)];
    } else if (value < 0.4) {
      // Navy to Royal Blue
      const t = (value - 0.2) / 0.2;
      return [Math.floor(25 + 10 * t), Math.floor(44 + 80 * t), Math.floor(125 + 130 * t)];
    } else if (value < 0.6) {
      // Royal Blue to Cyan / Aquamarine
      const t = (value - 0.4) / 0.2;
      return [Math.floor(35 * (1 - t)), Math.floor(124 + 110 * t), Math.floor(255 * (1 - 0.2 * t))];
    } else if (value < 0.8) {
      // Cyan to Emerald Green / Yellow
      const t = (value - 0.6) / 0.2;
      return [Math.floor(240 * t), Math.floor(234 + 21 * t), Math.floor(204 * (1 - t))];
    } else {
      // Yellow to Vivid Red/Crimson
      const t = (value - 0.8) / 0.2;
      return [Math.floor(240 + 15 * t), Math.floor(255 * (1 - 0.8 * t)), Math.floor(10 * (1 - t))];
    }
  }

  /**
   * Calculate frequency from canvas X coordinate click.
   */
  getFrequencyAtX(x: number, centerFreqHz: number, spanHz: number): number {
    const fraction = (x / this.width) - 0.5;
    return Math.round(centerFreqHz + fraction * spanHz);
  }
}
