import { WebSocket } from "ws";
import { SessionManager } from "../models/session.model";
import { GeminiService, GREETING_AUDIO } from "../services/gemini.service";
import { AudioService, StreamAudioProcessor } from "../services/audio.service";
import { TwilioService } from "../services/twilio.service";
import { AudioBuffer } from "../utils/audio-buffer.utils";
import { GeminiSessionData, TwilioMessage } from "../types";
import { AUDIO_FLUSH_INTERVAL, SILENCE_TIMEOUT } from "../config";
import { LeadController } from "../controllers/lead.controller";
import { sendBookingNotification } from "../services/notification.service";
import { processTranscriptsFormatting } from "../utils";

const sessionManager = SessionManager.getInstance();

export async function handleTwilioMessage(
  msg: TwilioMessage,
  twilioWs: WebSocket,
) {
  switch (msg.event) {
    case "connected":
      console.log("📞 Twilio connected");
      break;

    case "start": {
      if (!msg.start) break;
      const { streamSid, callSid } = msg.start;
      const { businessId, callerNumber, leadId } =
        msg.start.customParameters || {};

      LeadController.updateLead(leadId, { status: "answered" }).catch(
        console.error,
      );

      await createGeminiSession(
        streamSid,
        callSid,
        twilioWs,
        businessId,
        callerNumber,
        leadId,
      );

      break;
    }

    case "media": {
      if (!msg.streamSid || !msg.media) break;
      handleIncomingAudio(msg.streamSid, msg.media.payload);
      break;
    }

    case "stop": {
      if (!msg.streamSid) break;
      console.log("🛑 Call ended:", msg.streamSid);
      const session = sessionManager.get(msg.streamSid);
      if (session) {
        await captureDetailsAndEnd(session); // handles close + notification inside
      }
      sessionManager.delete(msg.streamSid);
      break;
    }
  }
}
// Add this helper
function streamGreetingAudio(ws: WebSocket, streamSid: string): number {
  if (!GREETING_AUDIO) return 0;

  // 160 bytes = 20ms of mulaw at 8kHz — matches Twilio's expected cadence
  const CHUNK_SIZE = 160;
  let offset = 0;

  const interval = setInterval(() => {
    const session = sessionManager.get(streamSid);
    if (!session || offset >= GREETING_AUDIO!.length) {
      clearInterval(interval);
      return;
    }
    const chunk = GREETING_AUDIO!.subarray(offset, offset + CHUNK_SIZE);
    offset += CHUNK_SIZE;
    TwilioService.sendMedia(ws, streamSid, chunk.toString("base64"));
  }, 20);

  // Return duration in ms so we can track when it's done
  return Math.ceil(GREETING_AUDIO.length / CHUNK_SIZE) * 20;
}
async function captureDetailsAndEnd(session: GeminiSessionData): Promise<void> {
  await new Promise<void>((resolve) => {
    // Safety timeout — if Gemini doesn't respond in 15s, close anyway
    const timeout = setTimeout(() => {
      console.warn("⚠️ Detail recap timed out, closing session");
      session.geminiSession.close();
      handleCallEnd(session).catch(console.error);
      resolve();
    }, 15_000);

    // Redirect Gemini messages to capture the recap transcription
    session.callbacksRef.onmessage = (msg: any) => {
      const aiText = msg.serverContent?.outputTranscription?.text;
      if (aiText) {
        session.transcripts.push({ role: "agent", message: aiText });
        console.log("📋 Recap:", aiText);
      }

      if (msg.serverContent?.turnComplete) {
        clearTimeout(timeout);
        session.geminiSession.close();
        handleCallEnd(session).catch(console.error);
        resolve();
      }
    };

    // Ask Gemini to read back everything it captured
    session.geminiSession.sendRealtimeInput({
      text: `The customer has ended the call. Please clearly read back all the booking details you captured:
        - Customer name
        - Service requested
        - Deadline or collection date
        - Email
        - Address or postcode
        - Branch
        Read each field clearly, one by one. Do not add anything else.`,
    });
  });
}
export async function createGeminiSession(
  streamSid: string,
  callSid: string,
  twilioWs: WebSocket,
  businessId: string,
  callerNumber: string, // ← pass callerNumber instead of systemPrompt
  leadId: string,
) {
  // ✅ Near-instant — no network round-trip
  const pooled = await GeminiService.popSession();

  // Wire real per-call callbacks into the mutable ref
  pooled.callbacks.onmessage = (msg: any) =>
    handleGeminiResponse(streamSid, msg);
  pooled.callbacks.onerror = (e: Error) =>
    console.error("❌ Gemini error:", e.message);
  pooled.callbacks.onclose = () => {
    console.log("🔒 Gemini closed:", streamSid);
    sessionManager.delete(streamSid);
  };

  sessionManager.set(streamSid, {
    geminiSession: pooled.session,
    callbacksRef: pooled.callbacks,
    streamSid,
    callSid,
    businessId,
    leadId,
    ws: twilioWs,
    audioBuffer: new AudioBuffer(),
    isAISpeaking: false,
    isUserSpeaking: false,
    audioProcessor: new StreamAudioProcessor(),
    transcripts: [],
    silenceTimer: null,
  });

  // ⚡ Stream pre-recorded greeting instantly — 0ms delay for caller
  const greetingDurationMs = streamGreetingAudio(twilioWs, streamSid);
  console.log(
    `🎙 Streaming greeting (${greetingDurationMs}ms) while Gemini listens...`,
  );

  // Tell Gemini the greeting was already said — it just needs to listen
  // GeminiService.triggerAIFirstMessage(
  //   pooled.session,
  //   "The welcome greeting has already been played to the customer. Listen for their response and reply naturally.",
  // );
  setInterval(() => flushAudioBuffer(streamSid), AUDIO_FLUSH_INTERVAL);
}

function handleIncomingAudio(streamSid: string, payload: string) {
  const session = sessionManager.get(streamSid);
  if (!session) return;

  const pcm16k = AudioService.mulawToPcm16k(payload);
  const hasVoice = AudioService.detectVoice(pcm16k, {
    threshold: 0.01,
    minEnergy: 100,
  });

  if (hasVoice) {
    session.isUserSpeaking = true;

    // Interrupt AI if user speaks
    if (session.isAISpeaking) {
      session.geminiSession.sendRealtimeInput({
        control: { type: "stop_output_audio" },
      });
      session.isAISpeaking = false;
    }

    if (session.silenceTimer) clearTimeout(session.silenceTimer);
    session.silenceTimer = setTimeout(() => {
      session.isUserSpeaking = false;
      flushAudioBuffer(streamSid);
    }, SILENCE_TIMEOUT);
  }

  session.audioBuffer.push(pcm16k);
}

function flushAudioBuffer(streamSid: string) {
  const session = sessionManager.get(streamSid);
  if (!session) return;
  const audio = session.audioBuffer.flush();
  if (!audio) return;
  session.geminiSession.sendRealtimeInput({
    audio: { data: audio.toString("base64"), mimeType: "audio/pcm;rate=16000" },
  });
}

export async function handleGeminiResponse(streamSid: string, message: any) {
  const session = sessionManager.get(streamSid);
  if (!session) return;

  // Interruption
  if (message.serverContent?.interrupted) {
    session.isAISpeaking = false;
    TwilioService.clearBuffer(session.ws, streamSid);
    return;
  }

  // Stream audio to caller
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  for (const part of parts) {
    if (!part.inlineData?.data || !part.inlineData?.mimeType) continue;
    const mulawAudio = session.audioProcessor.pcmToMulaw(
      part.inlineData.data,
      part.inlineData.mimeType,
    );
    session.isAISpeaking = true;
    TwilioService.sendMedia(session.ws, streamSid, mulawAudio);
  }

  if (message.serverContent?.turnComplete) {
    session.isAISpeaking = false;
  }

  // Transcripts
  const aiText = message.serverContent?.outputTranscription?.text;
  if (aiText) {
    session.transcripts.push({ role: "agent", message: aiText });
    console.log("🤖 AI:", aiText);
  }

  const userText = message.serverContent?.inputTranscription?.text;
  if (userText) {
    session.transcripts.push({ role: "user", message: userText });
    console.log("🧑 User:", userText);
  }
}

// Runs after call ends (Twilio stop event)
async function handleCallEnd(session: any) {
  if (!session.leadId) return;

  const { combined, formatted } = processTranscriptsFormatting(
    session.transcripts,
  );
  const leadDetails = await LeadController.getLead(session.leadId);
  console.log("leadDetails: ", leadDetails);

  const summary = await sendBookingNotification(
    formatted,
    leadDetails.phoneNumber as string,
  );

  await LeadController.updateLead(session.leadId, {
    status: "completed",
    callTranscription: combined,
    outcome: `📋 New Booking — ${summary.booking?.customer} · ${summary.booking?.service} · ${summary.booking?.branch}`,
  }).catch(console.error);
}
