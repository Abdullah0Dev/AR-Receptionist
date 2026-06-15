import * as ngrok from "@ngrok/ngrok";
import { CONFIG } from "../config";
import { setNgrokUrl } from "../controllers/call.controller";
import { TranscriptType } from "../types";

export const SYSTEM_INSTRUCTIONS = `You're a Pizza Restaurant receptionist and your GOAL is to get the person that you talk his name, and when he want his order... and confirm the price and whether he's confirming the willing to get the order`; // Your system instructions here

// Business hours: Mon–Sat 8am–7pm, Sun 10am–5pm (UK)
const now = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Europe/London" }),
);
const day = now.getDay(); // 0=Sun, 6=Sat
const hour = now.getHours();

const isOpen =
  (day >= 1 && day <= 6 && hour >= 8 && hour < 19) || // Mon–Sat
  (day === 0 && hour >= 10 && hour < 17); // Sun

const statusLine = isOpen
  ? "our staff are currently busy to pick up the phone"
  : "we are currently closed";

export const greeting = `Hi This is Eric An AI Receptionist for Gold Star Dry Cleaners — ${statusLine}, so How can I help you today?`;
export function getGoldStarSystemPrompt({
  userPhone,
  userPostcode,
}: {
  userPhone?: string;
  userPostcode?: string;
}) {
  const phone = userPhone?.replace("+1", "").replace("+44", "0");
  /**
 * 
START WITH THIS EXACT GREETING (no pauses, say it naturally):
"${greeting}"
 */

  return `
You are Eric, a warm, professional with UK London accent, and slightly casual AI receptionist and you already greeted the customer so continue talking as normal for Gold Star Dry Cleaners — a premium dry cleaning business with 4 branches across East London (Royal Wharf, Limehouse, Poplar, Canary Wharf).

OPENING HOURS (London time):
- Monday–Saturday: 8am–7pm
- Sunday: 10am–5pm
If a customer asks about hours, share the above. If they want to speak to staff directly, let them know staff will follow up.


ALREADY KNOW:
- Phone: ${phone || "not captured yet"}
- Postcode: ${userPostcode || "not provided yet"}

YOUR PERSONALITY:
Friendly, warm, a little chatty — like a helpful person at the front desk. Natural filler words like "of course", "absolutely", "let me just note that down". NOT robotic. NOT over-formal. Short sentences, 1–3 max per turn.

YOUR JOB — CAPTURE THIS INFO (one question at a time, in order):
1. What service are they looking for? (dry cleaning, laundry, alterations, wedding dress, collection, commercial, etc.)
2. What items and roughly how many?
3. Any stains, damage, or special requirements?
4. Postcode — to assign the right branch (if not already known)
5. Collection & delivery, or drop-in to a branch?
6. If booking: preferred date + collection address
7. Full name (you already have their number: ${phone || "ask for it"})
8. Email address

BRANCHES — assign based on postcode:
- Royal Wharf → E16 area
- Limehouse → SE16 area  
- Canary Wharf/Isle of Dogs → IG11 area
- Poplar → E2 area
If unsure, ask their postcode and say "I'll make sure the right branch gets in touch."

ROUGH PRICING (share only if asked — always say "roughly" or "starting from"):
- Suit: £15–25 | Shirt: £3–6 | Dress: £12–25 | Coat: £15–35
- Wedding Dress: £80–250+ | Duvet: £20–50 | Curtains: £15–40/pair
- Alterations: from £8 | Ironing: ask branch for current rates

RULES:
- ONE question at a time. Never stack two questions.
- TALK IN LONDON UK ACCENT
- Never give definitive prices — always "roughly" or "from around"
- Never diagnose stains or promise outcomes
- If it's a commercial enquiry (hotel, restaurant, salon etc.) — note it and say a manager will be in touch
- If they sound urgent or frustrated — acknowledge it warmly, keep moving

WHEN YOU HAVE: name, phone, postcode, service, items, and collection preference — the lead is fully qualified.
you can nicely greeting to end the call
`;
}

export async function startNgrok(port: string | number): Promise<string> {
  if (process.env.NODE_ENV === "production") return "running in production";
  const listener = await ngrok.connect({
    addr: port,
    authtoken: CONFIG.NGROK_AUTHTOKEN,
  });
  const url = listener.url()!;
  setNgrokUrl(url);
  return url;
}

/**
 * PATH 1: Returns a formatted string for Gemini summaries
 * Example: "Assistant: Hello there\nCustomer: Hi, I need help\nAssistant: Sure thing!"
 */
export function formatConversationForSummary(
  transcripts: TranscriptType[],
): string {
  let formatted = "";
  let currentSpeaker: "user" | "agent" | null = null;
  let currentMessage = "";

  for (const item of transcripts) {
    if (item.role === currentSpeaker) {
      // Same speaker - append with space
      currentMessage += item.message.startsWith(" ")
        ? item.message
        : ` ${item.message}`;
    } else {
      // New speaker - add previous to formatted text
      if (currentSpeaker) {
        const speakerLabel =
          currentSpeaker === "agent" ? "Assistant" : "Customer";
        formatted += `${speakerLabel}:${currentMessage}\n`;
      }
      // Start new speaker
      currentSpeaker = item.role;
      currentMessage = item.message;
    }
  }

  // Add the last message
  if (currentSpeaker) {
    const speakerLabel = currentSpeaker === "agent" ? "Assistant" : "Customer";
    formatted += `${speakerLabel}:${currentMessage}\n`;
  }

  return formatted.trim();
}
/**
 * PATH 2: Returns combined transcripts array
 * Example: [
 *   { role: "agent", message: "Hello there" },
 *   { role: "user", message: "Hi, I need help" },
 *   { role: "agent", message: "Sure thing!" }
 * ]
 */
export function combineTranscripts(
  transcripts: TranscriptType[],
): TranscriptType[] {
  const combined: TranscriptType[] = [];
  let currentSpeaker: "user" | "agent" | null = null;
  let currentMessage = "";

  for (const item of transcripts) {
    if (item.role === currentSpeaker) {
      // Same speaker - append with space handling
      currentMessage += item.message.startsWith(" ")
        ? item.message
        : ` ${item.message}`;
    } else {
      // New speaker - save previous if exists
      if (currentSpeaker) {
        combined.push({
          role: currentSpeaker,
          message: currentMessage.trim(),
        });
      }
      // Start new speaker
      currentSpeaker = item.role;
      currentMessage = item.message;
    }
  }

  // Don't forget the last one
  if (currentSpeaker) {
    combined.push({
      role: currentSpeaker,
      message: currentMessage.trim(),
    });
  }

  return combined;
}

/**
 * Optional: Combined function that does both
 */
export function processTranscriptsFormatting(transcripts: TranscriptType[]): {
  combined: TranscriptType[];
  formatted: string;
} {
  const combined = combineTranscripts(transcripts);
  const formatted = formatConversationForSummary(combined);
  return { combined, formatted };
}
