import { WebSocket } from "ws";
import { LiveServerMessage } from "@google/genai";
import { AudioBuffer } from "../utils/audio-buffer.utils";
import { GeminiSessionData } from "../types";
import { StreamAudioProcessor } from "../services/audio.service";

export class SessionManager {
  private static instance: SessionManager;
  private activeSessions = new Map<string, GeminiSessionData>();

  private constructor() {} 

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  get(streamSid: string): GeminiSessionData | undefined {
    return this.activeSessions.get(streamSid);
  }

  set(streamSid: string, sessionData: GeminiSessionData): void {
    this.activeSessions.set(streamSid, sessionData);
  }

  delete(streamSid: string): boolean {
    return this.activeSessions.delete(streamSid);
  }

  getAll(): Map<string, GeminiSessionData> {
    return this.activeSessions;
  }
}