"use server";

import { geminiClient } from "./gemini.service";
import { Resend } from "resend";
import BookingNotificationEmail, {
  type BookingNotificationEmailProps,
} from "../emails/booking-notification";
import { TwilioService } from "./twilio.service";
import BookingConfirmationEmail from "../emails/booking-confirmation";

const resend = new Resend(process.env.RESEND_API_KEY);

const EXTRACTION_PROMPT = `You are a data extraction assistant for a dry cleaning / laundry receptionist service.

Given a call transcript, extract the following fields and return ONLY a JSON object — no preamble, no markdown fences.

Fields to extract:
- customer   (full name of the customer)
- service    (the cleaning service requested, e.g. "Tuxedo Cleaning", "Shirt Press", "Duvet Wash")
- deadline   (when the customer needs it back, e.g. "Within 2 Days", "By Friday", "Same Day")
- phone      (customer's phone number)
- email      (customer's email number)
- address    (customer's postcode or area, e.g. "E14", "SW1A 2AA")
- branch     (the branch name they are contacting or closest to, e.g. "Canary Wharf")
- notes      (any extra details worth flagging — optional, omit or set to null if nothing relevant)

Rules:
- If a field cannot be found in the transcript, use "Not provided" as the value (except notes).
- Do not invent or guess values — only extract what is explicitly stated.
- Return strictly valid JSON, nothing else.

Example output:
{
  "customer": "John Smith",
  "service": "Tuxedo Cleaning",
  "deadline": "Within 2 Days",
  "phone": "07700 900123",
  "email": "john@gmail.com",
  "address": "E14",
  "branch": "Canary Wharf",
  "notes": null
}`;

async function sendConfirmationToCustomer(
  booking: BookingNotificationEmailProps,
) {
  // send SMS & Email
  await TwilioService.sendSMS(
    `Hi ${booking.customer}, your ${booking.service} booking at our ${booking.branch} branch has been received. We'll call you shortly to confirm collection. – Gold Star Dry Cleaners`,
    // booking.phone,
    booking.phone,
    "+17753678856", // send sms from number:
  );
  await TwilioService.sendWhatsappMessage(
    `Hi ${booking.customer}, your ${booking.service} booking at our ${booking.branch} branch has been received. We'll call you shortly to confirm collection. – Gold Star Dry Cleaners`,
    // booking.phone,
    "+447856239875",
    // "+17753678856", // send sms from number:
  );
  console.info("Send SMS to: ", booking.phone);

  if (booking.email && booking.email.includes("@")) {
    await resend.emails.send({
      from: "AutoReception.AI <booking@updates.aireceptions.co.uk>",
      to: booking.email,
      // to: "webminds000@gmail.com",
      subject: `✅ Booking received — ${booking.service} at ${booking.branch}`,
      react: BookingConfirmationEmail({
        branch: booking.branch,
        customer: booking.customer,
        deadline: booking.deadline,
        service: booking.service,
        // notes: booking.notes
      }),
    });
  }
  return {
    success: true,
    message: "Sent Confirmation to Customer successfully alhamdullah",
  };
}
async function extractBookingFromTranscript(
  transcript: string,
): Promise<BookingNotificationEmailProps> {
  const response = await geminiClient.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `${EXTRACTION_PROMPT}\n\nHere is the call transcript:\n\n${transcript}`,
  });

  const raw = response.text ?? "";

  // Strip any accidental markdown fences just in case
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as BookingNotificationEmailProps;
  return parsed;
}

export async function sendBookingNotification(
  transcript: string,
  phoneNumber: string,
) {
  let booking: BookingNotificationEmailProps;

  try {
    booking = await extractBookingFromTranscript(transcript);
    booking.phone = booking.phone.toLowerCase().includes("not")
      ? phoneNumber
      : booking.phone;
    console.log("booking: ", booking);
  } catch (error) {
    console.error("Failed to extract booking from transcript:", error);
    return { success: false, error: "Failed to read transcript." };
  }

  try {
    // if lead isn't qualified and most of the stuff isn't qualified don't send it just it saved in DB => likely spam
    const notQualifiedLead =
      booking.phone.toLowerCase().includes("not") ||
      (booking.customer.toLowerCase().includes("not") &&
        booking.service.toLowerCase().includes("not"));
    if (notQualifiedLead) {
      return { success: false, booking };
    }
    // send customer confirmation SMS/Email and owner lead
    await resend.emails.send({
      from: "AutoReception.AI <leads@updates.aireceptions.co.uk>",
      to: "rohanautoreceptionai@gmail.com",
      // to: "webminds000@gmail.com",
      subject: `📋 New Booking — ${booking.customer} · ${booking.service} · ${booking.branch}`,
      react: BookingNotificationEmail({ ...booking }),
    });
    // send customer confirmation email
    sendConfirmationToCustomer({ ...booking });

    return { success: true, booking };
  } catch (error) {
    console.error("Failed to send booking notification email:", error);
    return { success: false, error: "Failed to send email." };
  }
}
