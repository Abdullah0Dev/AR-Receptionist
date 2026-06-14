import { mulaw } from "alawmulaw";

const { decodeSample, encodeSample } = mulaw;

interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

interface BiquadCoeffs {
  b: [number, number, number];
  a: [number, number, number];
}

// 4th-order Butterworth = two cascaded biquad stages
// Stage Q values for 4th-order Butterworth: Q1=1.3066, Q2=0.5412

// 24kHz → 8kHz (fc=4kHz, K=tan(π/6)=0.57735)
const STAGES_24K: BiquadCoeffs[] = [
  { b: [0.18776, 0.37552, 0.18776], a: [1.0, -0.75106, 0.50212] }, // Q=1.3066
  { b: [0.13888, 0.27776, 0.13888], a: [1.0, -0.55552, 0.11104] }, // Q=0.5412
];

// 16kHz → 8kHz (fc=4kHz, K=tan(π/4)=1.0)
const STAGES_16K: BiquadCoeffs[] = [
  { b: [0.36163, 0.72325, 0.36163], a: [1.0, 0.0, 0.44649] }, // Q=1.3066
  { b: [0.2599, 0.51981, 0.2599], a: [1.0, 0.0, 0.0396] }, // Q=0.5412
];

export class StreamAudioProcessor {
  // Two persistent states — one per biquad stage
  private states24k: BiquadState[] = [
    { x1: 0, x2: 0, y1: 0, y2: 0 },
    { x1: 0, x2: 0, y1: 0, y2: 0 },
  ];
  private states16k: BiquadState[] = [
    { x1: 0, x2: 0, y1: 0, y2: 0 },
    { x1: 0, x2: 0, y1: 0, y2: 0 },
  ];
  warmup(mimeType: string): void {
    const silence = new Int16Array(mimeType.includes("24000") ? 2400 : 1600); // 100ms
    if (mimeType.includes("24000")) {
      this.applyFilterCascade(silence, STAGES_24K, this.states24k);
    } else {
      this.applyFilterCascade(silence, STAGES_16K, this.states16k);
    }
  }
  private applyBiquad(
    input: Int16Array,
    coeffs: BiquadCoeffs,
    state: BiquadState,
  ): Int16Array {
    const { b, a } = coeffs;
    const output = new Int16Array(input.length);
    let { x1, x2, y1, y2 } = state;

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i] / 32768;
      const y0 = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      output[i] = Math.max(-32768, Math.min(32767, Math.round(y0 * 32768)));
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }

    state.x1 = x1;
    state.x2 = x2;
    state.y1 = y1;
    state.y2 = y2;
    return output;
  }

  private applyFilterCascade(
    samples: Int16Array,
    stages: BiquadCoeffs[],
    states: BiquadState[],
  ): Int16Array {
    let signal = samples;
    for (let i = 0; i < stages.length; i++) {
      signal = this.applyBiquad(signal, stages[i], states[i]);
    }
    return signal;
  }

  pcmToMulaw(base64Pcm: string, mimeType: string): string {
    const pcm = Buffer.from(base64Pcm, "base64");
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);

    let downsampled: Int16Array;

    if (mimeType.includes("24000")) {
      const filtered = this.applyFilterCascade(
        samples,
        STAGES_24K,
        this.states24k,
      );
      downsampled = new Int16Array(Math.floor(filtered.length / 3));
      for (let i = 0; i < downsampled.length; i++)
        downsampled[i] = filtered[i * 3];
    } else if (mimeType.includes("16000")) {
      const filtered = this.applyFilterCascade(
        samples,
        STAGES_16K,
        this.states16k,
      );
      downsampled = new Int16Array(Math.floor(filtered.length / 2));
      for (let i = 0; i < downsampled.length; i++)
        downsampled[i] = filtered[i * 2];
    } else {
      downsampled = samples;
    }

    const mulawBuffer = Buffer.alloc(downsampled.length);
    for (let i = 0; i < downsampled.length; i++)
      mulawBuffer[i] = encodeSample(downsampled[i]);
    return mulawBuffer.toString("base64");
  }
}

// Static-only methods unchanged
export class AudioService {
  static upsample8kTo16k(pcm8k: Int16Array): Int16Array {
    const pcm16k = new Int16Array(pcm8k.length * 2);
    for (let i = 0; i < pcm8k.length - 1; i++) {
      pcm16k[i * 2] = pcm8k[i];
      pcm16k[i * 2 + 1] = Math.floor((pcm8k[i] + pcm8k[i + 1]) / 2);
    }
    pcm16k[pcm16k.length - 1] = pcm8k[pcm8k.length - 1];
    return pcm16k;
  }

  static detectVoice(
    pcmData: Buffer,
    options: { threshold: number; minEnergy: number },
  ): boolean {
    const samples = new Int16Array(
      pcmData.buffer,
      pcmData.byteOffset,
      pcmData.length / 2,
    );
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length) > options.minEnergy;
  }

  static mulawToPcm16k(mulawBase64: string): Buffer {
    const mulawBuffer = Buffer.from(mulawBase64, "base64");
    const pcm8k = new Int16Array(mulawBuffer.length);
    for (let i = 0; i < mulawBuffer.length; i++)
      pcm8k[i] = decodeSample(mulawBuffer[i]);
    const pcm16k = this.upsample8kTo16k(pcm8k);
    return Buffer.from(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength);
  }
}
