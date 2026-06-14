import { Request, Response } from "express";
import { TwilioService } from "../services/twilio.service";
import { AUDIO_FLUSH_INTERVAL, CONFIG } from "../config";
import { BusinessController } from "./business.controller";
import { PromptService } from "../services/prompt.service";
import { GeminiService } from "../services/gemini.service";
import { SessionManager } from "../models/session.model";
import twilio from "twilio";
import { handleGeminiResponse } from "../websocket/message-handlers";
import { LeadController } from "./lead.controller";

let ngrokUrl = "";

export const setNgrokUrl = (url: string) => {
  ngrokUrl = url;
};
const sessionManager = SessionManager.getInstance();

export class CallController {
  static async incomingCall(req: Request, res: Response) {
    const twiml = new twilio.twiml.VoiceResponse();

    // Get the business phone number from Twilio (the number they called)
    const calledNumber = req.body.To; // Your Twilio number
    const callerNumber = req.body.From; // The customer's number
    const forwardedFrom = req.body.ForwardedFrom; // The contractor's original number (if forwarded)

    // Determine which business this is for
    let businessPhone = calledNumber;
    if (forwardedFrom) {
      businessPhone = forwardedFrom;
      console.log(`📞 Call forwarded from ${forwardedFrom} to ${calledNumber}`);
    }

    console.log(`📞 Incoming call to ${businessPhone} from ${callerNumber}`);

    // Look up which business owns this number
    const business = await BusinessController.getByPhoneNumber(businessPhone);

    if (!business) {
      console.log(`❌ Business Not found: ${business}`);
      // No business found for this number
      twiml.play("../config/business-not-found.mp3");
      twiml.hangup();
      return res.type("text/xml").send(twiml.toString());
    }

    console.log(`✅ Business found: ${business.businessName}`);
    let leadId: string | null = null;
    try {
      const lead = await LeadController.createLead({
        phoneNumber: callerNumber,
        businessId: business.id,
        status: "in-progress",
      });
      leadId = lead._id.toString();
      console.log(`✅ Lead created: ${leadId}`);
    } catch (error) {
      console.error("Failed to create lead, but continuing call:", error);
    }
    // Generate the dynamic prompt for this business and caller
    const systemPrompt = PromptService.generateForBusiness(
      business,
      callerNumber,
    );

    // Waiting Msg)
    // twiml.say("Please hold while I connect you.");
    // twiml.pause({ length: 1 });
    // Before the connect block:
    // twiml.pause({ length: 1 });
    // We'll pass this via custom parameters
    const connect = twiml.connect();
    const stream = connect.stream({
      url: `wss://${req.headers.host}/media-stream`,
    });

    // Pass business context as custom parameters
    stream.parameter({
      name: "businessId",
      value: business.id,
    });
    stream.parameter({
      name: "leadId",
      value: leadId,
    });

    stream.parameter({ name: "callerNumber", value: callerNumber });

    stream.parameter({
      name: "firstMessage",
      value: "Hello",
    });

    // make about 3 rings
    res.type("text/xml").send(twiml.toString());
  }
  static async voiceWebhook(req: Request, res: Response) {
    const response = TwilioService.createVoiceResponse();
    const connect = response.connect();
    response.pause({ length: 0.1 });
    connect.stream({ url: `wss://${req.headers.host}/media-stream` });

    res.type("text/xml");
    res.send(response.toString());
  }
  static async makeOutboundCall(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;
      await TwilioService.makeCall(phoneNumber, ngrokUrl);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to make call" });
    }
  }
}
