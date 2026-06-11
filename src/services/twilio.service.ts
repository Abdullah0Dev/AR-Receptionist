import twilio from "twilio";
import type WS from "ws";
import { CONFIG } from "../config";

export const twilioClient = twilio(
  CONFIG.TWILIO_ACCOUNT_SID,
  CONFIG.TWILIO_AUTH_TOKEN,
);

export class TwilioService {
  static async sendSMS(text: string, to: string, from?: string) {
    const message = await twilioClient.messages.create({
      body: text,
      from: from ?? "+17753678856",
      to: to,
    });
    return message;
  }
  static async sendWhatsappMessage(text: string, to?: string, from?: string) {
    const whatsappTo = to ? `whatsapp:${to}` : "whatsapp:+447856239875";
    const message = await twilioClient.messages.create({
      body: text,
      from: from ?? "whatsapp:+14155238886",
      to: whatsappTo,
    });
    return message;
  }
  static createVoiceResponse() {
    return new twilio.twiml.VoiceResponse();
  }

  static async makeCall(to: string, ngrokUrl: string) {
    const call = await twilioClient.calls.create({
      to,
      from: CONFIG.TWILIO_PHONE_NUMBER,
      url: `${ngrokUrl}/voice`,
    });
    console.log("📞 Outbound call:", call.sid);
    return call;
  }

  static sendMedia(ws: WS, streamSid: string, payload: string) {
    ws.send(
      JSON.stringify({
        event: "media",
        streamSid,
        media: { payload },
      }),
    );
  }

  static clearBuffer(ws: WS, streamSid: string) {
    ws.send(
      JSON.stringify({
        streamSid,
        event: "clear",
      }),
    );
  }

  static async hangupCall(callSid: string): Promise<void> {
    try {
      await twilioClient.calls(callSid).update({ status: "completed" });
      console.log(`✅ Call ${callSid} hung up successfully`);
    } catch (error) {
      console.error(`❌ Failed to hang up call ${callSid}:`, error);
    }
  }
}
