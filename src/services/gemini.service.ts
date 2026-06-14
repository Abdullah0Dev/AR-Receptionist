import { GoogleGenAI, Modality } from "@google/genai";
import { CONFIG, MODEL } from "../config";
import { StreamAudioProcessor } from "./audio.service";

export const geminiClient = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

// Cached greeting audio in mulaw — filled once at startup
export let GREETING_AUDIO: Buffer | null = null;

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
        const idx = pool.indexOf(pooled);
        if (idx !== -1) {
          clearInterval(pool[idx].keepAliveInterval!);
          pool.splice(idx, 1);
          refill();
        }
        callbacks.onclose();
      },
    },
  });

  pooled = { session, callbacks, keepAliveInterval: null };
  pooled.keepAliveInterval = setInterval(() => {
    try {
      session.sendRealtimeInput({
        audio: {
          data: Buffer.alloc(320).toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
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
  static async initPool(systemPrompt: string, size = 2): Promise<void> {
    _systemPrompt = systemPrompt;
    console.log(`🔥 Pre-warming ${size} Gemini sessions...`);
    const results = await Promise.allSettled(
      Array.from({ length: size }, async () => {
        const p = await createPooledSession();
        pool.push(p);
      }),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    console.log(`✅ Gemini pool ready (${ok}/${size} sessions)`);
  } 

  // Generates the greeting once at startup in Puck's voice, stores as mulaw
  static async generateGreeting(greetingText: string): Promise<void> {
    console.log("🎙 Pre-generating greeting audio...");
    const chunks: Buffer[] = [];
    const processor = new StreamAudioProcessor();
    let warmedUp = false;
    let session: any;

    await new Promise<void>((resolve, reject) => {
      geminiClient.live
        .connect({
          model: MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
            systemInstruction:
              "You are a voice assistant. Say exactly what the user asks, nothing more with a friendly UK London accent.",
          },
          callbacks: {
            onopen: () => {},
            onmessage: (msg: any) => {
              const parts = msg.serverContent?.modelTurn?.parts ?? [];
              for (const part of parts) {
                if (!part.inlineData?.data || !part.inlineData?.mimeType)
                  continue;

                // Warm up filter once on first chunk before processing any audio
                if (!warmedUp) {
                  processor.warmup(part.inlineData.mimeType);
                  warmedUp = true;
                }

                const mulaw = processor.pcmToMulaw(
                  part.inlineData.data,
                  part.inlineData.mimeType,
                );
                chunks.push(Buffer.from(mulaw, "base64"));
              }
              if (msg.serverContent?.turnComplete) {
                GREETING_AUDIO = Buffer.concat(chunks);
                console.log(
                  `✅ Greeting audio ready (${GREETING_AUDIO.length} bytes)`,
                );
                session.close();
                resolve();
              }
            },
            onerror: (e: any) => reject(e),
            onclose: () => {},
          },
        })
        .then((s) => {
          session = s;
          session.sendRealtimeInput({ text: greetingText });
        })
        .catch(reject);
    });
  }

  static async popSession(): Promise<PooledSession> {
    const warm = pool.pop();
    refill();
    if (warm) {
      clearInterval(warm.keepAliveInterval!);
      warm.keepAliveInterval = null;
      return warm;
    }
    console.warn("⚠️ Gemini pool empty — cold starting");
    return createPooledSession();
  }

  static triggerAIFirstMessage(session: any, text: string): void {
    session.sendRealtimeInput({ text });
  }
}
