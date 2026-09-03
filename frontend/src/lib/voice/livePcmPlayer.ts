/** Play Gemini Live PCM output (16-bit LE mono, typically 24 kHz). */

const LIVE_OUTPUT_RATE = 24000;

let ctx: AudioContext | null = null;
let nextStart = 0;
const activeSources = new Set<AudioBufferSourceNode>();

export function stopLivePcmPlayback(): void {
  for (const source of activeSources) {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  }
  activeSources.clear();
  if (ctx) {
    void ctx.close();
    ctx = null;
  }
  nextStart = 0;
}

export function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return samples;
}

export type LiveMessageAudioShape = {
  serverContent?: {
    modelTurn?: {
      parts?: { inlineData?: { data?: string; mimeType?: string }; text?: string }[];
    };
  };
};

/** Extract base64 PCM payloads from a Live server message. */
export function extractLiveAudioBase64Parts(message: LiveMessageAudioShape): string[] {
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  const out: string[] = [];
  for (const part of parts) {
    const mime = part.inlineData?.mimeType ?? "";
    const data = part.inlineData?.data;
    if (data && mime.startsWith("audio/pcm")) out.push(data);
  }
  return out;
}

export async function enqueueLivePcmBase64(
  base64: string,
  sampleRate = LIVE_OUTPUT_RATE
): Promise<void> {
  if (typeof window === "undefined" || !base64) return;

  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext({ sampleRate });
    nextStart = 0;
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const samples = base64PcmToFloat32(base64);
  if (samples.length === 0) return;

  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  // getChannelData().set avoids Float32Array<ArrayBufferLike> vs ArrayBuffer mismatch (TS 5.7+)
  buffer.getChannelData(0).set(samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  const startAt = Math.max(ctx.currentTime, nextStart);
  source.start(startAt);
  nextStart = startAt + buffer.duration;
  activeSources.add(source);
  source.onended = () => {
    activeSources.delete(source);
  };
}
