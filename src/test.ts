import "dotenv/config";
import { TwilioService } from "./services/twilio.service";
import { CONFIG } from "./config";

async function run() {
  await TwilioService.sendSMS(
    `Hi Rohan, your __ booking at our ___ branch has been received. We'll call you shortly to confirm collection. – Gold Star Dry Cleaners
    
    mate, this is just a test to see if it's working`,
    // booking.phone,
    "+447305766194",
    CONFIG.TWILIO_PHONE_NUMBER, // send sms from number:
  );
  console.log("send SMS: ");
}

run();
