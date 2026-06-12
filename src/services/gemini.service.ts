import { GoogleGenAI, Modality } from "@google/genai";
import { CONFIG, MODEL } from "../config";

export const geminiClient = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

export interface PooledSession {
  session: any;
  callbacks: {
    onmessage: (msg: any) => void;
    onerror: (e: unknown) => void;
    onclose: () => void;
  };
  keepAliveInterval: ReturnType<typeof setInterval> | null;
}

const pool: PooledSession[] = [];
let _systemPrompt = "";

async function createPooledSession(): Promise<PooledSession> {
  // Declared with let so the onclose closure can reference it
  let pooled!: PooledSession;

  const callbacks: PooledSession["callbacks"] = {
    onmessage: () => {},
    onerror: () => {},
    onclose: () => {},
  };

  const session = await geminiClient.live.connect({
    model: MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
      },
      systemInstruction: _systemPrompt,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => {},
      onmessage: (msg) => callbacks.onmessage(msg),
      onerror: (e) => callbacks.onerror(e),
      onclose: () => {
        // Only matters if this session is still sitting in the pool
        const idx = pool.indexOf(pooled);
        if (idx !== -1) {
          clearInterval(pool[idx].keepAliveInterval!);
          pool.splice(idx, 1);
          refill(); // replace the dead slot
        }
        callbacks.onclose();
      },
    },
  });

  pooled = { session, callbacks, keepAliveInterval: null };

  // Keep idle sessions alive with silence pings
  pooled.keepAliveInterval = setInterval(() => {
    try {
      session.sendRealtimeInput({
        audio: { data: Buffer.alloc(320).toString("base64"), mimeType: "audio/pcm;rate=16000" },
      });
    } catch (_) {}
  }, 8_000);

  return pooled;
}

function refill(): void {
  createPooledSession()
    .then((p) => pool.push(p))
    .catch((e) => {
      console.error("❌ Pool refill failed, retrying in 5s:", e.message);
      setTimeout(refill, 5_000);
    });
}

export class GeminiService {
  // Call once at server startup — blocks until pool is ready
  static async initPool(systemPrompt: string, size = 2): Promise<void> {
    _systemPrompt = systemPrompt;
    console.log(`🔥 Pre-warming ${size} Gemini sessions...`);

    const results = await Promise.allSettled(
      Array.from({ length: size }, async () => {
        const p = await createPooledSession();
        pool.push(p);
      })
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    console.log(`✅ Gemini pool ready (${ok}/${size} sessions)`);
  }

  // ~0ms if pool has a session; cold-starts only if pool is empty
  static async popSession(): Promise<PooledSession> {
    const warm = pool.pop();
    refill(); // replenish immediately

    if (warm) {
      clearInterval(warm.keepAliveInterval!); // real call owns it now
      warm.keepAliveInterval = null;
      return warm;
    }

    console.warn("⚠️ Gemini pool empty — cold starting (should be rare)");
    return createPooledSession();
  }

  static triggerAIFirstMessage(session: any, text: string): void {
    session.sendRealtimeInput({ text });
  }
}