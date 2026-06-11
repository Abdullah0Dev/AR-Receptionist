import { WebSocketServer, WebSocket } from "ws";
import { SessionManager } from "../models/session.model";
import { TwilioMessage } from "../types";
import { handleTwilioMessage } from "./message-handlers";

const sessionManager = SessionManager.getInstance();

export const setupWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", (twilioWs: WebSocket) => {
    let streamSid: string | null = null;

    twilioWs.on("message", (raw) => {
      process.nextTick(async () => {
        const msg = JSON.parse(raw.toString()) as TwilioMessage;
        const result = await handleTwilioMessage(msg, twilioWs);
        // if (result?.streamSid) {
        //   streamSid = result.streamSid;
        // }
      });
    });

    twilioWs.on("close", () => {
      if (streamSid) {
        const session = sessionManager.get(streamSid);
        if (session?.geminiSession) {
          session.geminiSession.close();
        }
        sessionManager.delete(streamSid);
      }
    });
  });
};