import { WebSocket } from "ws";
import { LiveServerMessage } from "@google/genai";
import { AudioBuffer } from "../utils/audio-buffer.utils";
import { StreamAudioProcessor } from "../services/audio.service";
import { PooledSession } from "../services/gemini.service";

export interface GeminiSessionData {
  geminiSession: any;
  streamSid: string;
  callerNumber: string;
  audioProcessor: StreamAudioProcessor;
  businessId: string;
  callSid: string;
  ws: WebSocket;
  audioBuffer: AudioBuffer;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  isHangingUp?: boolean;
  pendingHangup?: boolean;
  dispatchReady?: boolean;
  hasAskedFirstQuestion?: boolean;
  silenceTimer?: NodeJS.Timeout | null;
  hangupTimer?: NodeJS.Timeout;
  transcripts: TranscriptType[];
  callbacksRef: PooledSession["callbacks"]; // 👈 add this
}

export interface TwilioMessage {
  event: string;
  streamSid?: string;
  start?: {
    customParameters: {
      businessId?: string;
      leadId?: string;
      callerNumber?: string;
      firstMessage?: string;
    };
    streamSid: string;
    callSid: string;
  };
  media?: {
    payload: string;
  };
}

export interface FonosterMessage {
  type: string;
  streamId?: string;
  sessionId?: string;
  callId?: string;
  payload?: {
    type: string;
    format: string;
    sampleRate: number;
    data: string;
  };
}

export interface FonosterConfig {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  phoneNumber: string;
}

export type AudioFormat = "8000" | "16000" | "24000";

export type SystemPromptType = {
  category: BusinessCategory;
  businessName: string;
  userName?: string;
  userPhone?: string;
  userZipCode?: string;
};
export type SystemUpdateType = {
  email: string;
  message: string;
};

export type BusinessCategory =
  | "hvac"
  | "plumber"
  | "electrician"
  | "handyman"
  | "landscaper"
  | "mover"
  | "painter"
  | "cleaner"
  | "contractor"
  | "roofer";

export type summarizeAndNotifyType = {
  businessId: string;
  callTranscription: string;
  customerPhone: string;
};

// types.ts
export interface TranscriptType {
  role: "user" | "agent";
  message: string;
}
