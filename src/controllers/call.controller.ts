import { Request, Response } from "express";
import { TwilioService } from "../services/twilio.service"; 
import twilio from "twilio"; 

let ngrokUrl = "";

export const setNgrokUrl = (url: string) => {
  ngrokUrl = url;
}; 

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
 
    // We'll pass this via custom parameters
    const connect = twiml.connect();
    const stream = connect.stream({
      url: `wss://${req.headers.host}/media-stream`,
    });

    // Pass business context as custom parameters
    stream.parameter({
      name: "businessId",
      value: "gold-star-dry-cleaners-1234",
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
