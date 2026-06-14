import * as ngrok from "@ngrok/ngrok";
import { CONFIG } from "../config";
import { setNgrokUrl } from "../controllers/call.controller";
import { BusinessCategory, SystemPromptType, TranscriptType } from "../types";

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
  : " we are currently closed";

export const greeting = `Hello! This is Eric, an AI reposts for Gold Star Dry Cleaners — ${statusLine}, so I'm here to help. How can I help you today?`;
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

export function getSystemPromptForCategory({
  category,
  businessName,
  userName,
  userPhone: userPhoneNumber,
  userZipCode,
}: SystemPromptType) {
  const userPhone = userPhoneNumber?.replace("+1", "");
  const RECEPTIONIST_NAME = `Sarah`;
  const workerTitle = getBusinessTitle(category);
  const greeting = `Thanks for calling ${businessName || "us"} This is ${RECEPTIONIST_NAME} How may I help you today?`;

  const basePrompt = `
You're ${RECEPTIONIST_NAME}, friendly & SUPER CASUAL  UK receptionist for ${businessName} london based biz. like texting a friend. Use contractions, throw in "umm"/"oh!"/etc. React naturally (laugh, "yikes!"). 1-2 sentences max.

START WITH and make sure to say it with NO PAUSES: ${greeting} 

Already know: Phone: ${userPhone} | Zip: ${userZipCode || "No Provided Yet"}

YOUR VOICE:  REALLY FAST Talking, and younger girl like 18 years old and more of a human, like make umm, laugh, thinking and so on...

Your job:
- Get name early, but you already have their number
- If zip missing, ask ONCE: "Just to make sure we send the right team, what's your zip?"
- NO pricing, diagnosing, or advice - you're not the plumber!
- Wrap up naturally like a real receptionist would.

CRITICAL: ONE QUESTION AT A TIME. If you ask two, stop yourself. Wait for answer. Then next. 

ANOTHER CRITICAL:When the lead is fully qualified and ready to dispatch, end your message with this exact hidden tag on a new line:

[DISPATCH_READY]

 `;
  //  and do not SPEECH IT just a msg
  const categoryPrompts = {
    plumber: `
${basePrompt}

Quick checklist for plumbing jobs:
- What's going on? (leak, clog, install, etc.)
- How urgent is it? (water everywhere? just started?)
- Where is this? (house, apartment, business)
- When did this start happening?
- Any water damage or flooding happening now?
`,

    hvac: `
${basePrompt}

Quick checklist for HVAC jobs:
- AC or heat acting up?
- What's it doing (or not doing)?
- How urgent? (freezing/sweltering, or just not quite right?)
- Where is this? (home, apartment, business)
- Did you try adjusting the thermostat?
- When did you first notice it?
`,

    electrician: `
${basePrompt}

Quick checklist for electrical jobs:
- What's happening? (lights flickering, outlets dead, breaker tripping?)
- Any sparks, smells, or scary stuff? (safety first!)
- Where in the property?
- When did it start?
- Is it a partial outage or whole area affected?
`,

    handyman: `
${basePrompt}

Quick checklist for handyman jobs:
- What needs fixing or assembling?
- Inside or outside?
- Got the materials already or need us to bring stuff?
- When works for you?
- Any special tools needed?
`,

    landscaper: `
${basePrompt}

Quick checklist for landscaping:
- What kind of yard work? (mow, trim, design, plant?)
- Home or business?
- Rough idea of the space size?
- One-time thing or regular maintenance?
- Any specific requests or ideas in mind?
`,

    mover: `
${basePrompt}

Quick checklist for moving:
- Local move or long distance?
- Moving date?
- House or apartment size? (bedrooms, sq ft)
- Need packing help or just the heavy lifting?
- Any special items? (piano, pool table, artwork?)
- Stairs, elevator, or ground floor?
`,

    painter: `
${basePrompt}

Quick checklist for painting:
- Inside, outside, or both?
- What rooms/areas?
- Approx size of the space?
- Timeline?
- Got colors picked out or need help deciding?
`,

    cleaner: `
${basePrompt}

Quick checklist for cleaning:
- What kind of clean? (deep, regular, move-in/out)
- Home or business?
- Size of the space? (bedrooms/baths or sq ft)
- Preferred day/time?
- Any spots to focus on?
- Pets at home? 🐱🐶
`,

    contractor: `
${basePrompt}

Quick checklist for contracting work:
- What's the project? (reno, repair, build?)
- Which part of the property?
- Looking to start soon or planning ahead?
- Rough budget ballpark?
- Home or business?
- Need help with permits?
`,

    roofer: `
${basePrompt}

Quick checklist for roofing:
- What's going on? (leak, damage, replacement, check-up?)
- When did you notice it?
- Any active leaks or water inside?
- Home or business?
- How old is the roof?
- Recent storms in the area?
`,
  };

  return categoryPrompts[category] || categoryPrompts.plumber;
}
// Helper function to get summary prompt based on category
export function getSummaryPromptForCategory(
  category: BusinessCategory,
  businessName: string,
) {
  const basePrompt = `
You are a dispatch assistant for ${businessName || "a service business"}.

Summarize the conversation into a short, clear job brief for the service professional.

Keep it under 100 words.
Be direct and practical.
No fluff.
`;

  const categorySpecificPrompts = {
    plumber: `
${basePrompt}

Include:
- Main plumbing issue (leak, clog, installation, etc.)
- Urgency level (Low, Medium, High)
- When the issue started
- Location type (home, apartment, business)
- Any active damage or water issues
- Any important details or clarifications
`,

    hvac: `
${basePrompt}

Include:
- Whether it's heating or cooling issue
- Main symptoms (no air, strange noises, not working)
- Urgency level (Low, Medium, High) - especially if extreme temps
- When the problem started
- Location type (home, apartment, business)
- Any thermostat or basic troubleshooting done
`,

    electrician: `
${basePrompt}

Include:
- Type of electrical issue (outage, flickering, breaker tripping)
- Urgency level (Low, Medium, High) - note any safety concerns
- When it started
- Location type (home, apartment, business)
- Any visible damage, sparks, or burning smells
`,

    handyman: `
${basePrompt}

Include:
- Type of repair or task needed
- Indoor or outdoor work
- Urgency level (Low, Medium, High)
- Location type (home, apartment, business)
- Whether customer has materials or needs them provided
`,

    landscaper: `
${basePrompt}

Include:
- Type of service needed (mowing, trimming, design, etc.)
- Property type (residential/commercial)
- Approximate area size
- Urgency level (Low, Medium, High)
- Whether one-time or recurring service
`,

    mover: `
${basePrompt}

Include:
- Type of move (local/long-distance, residential/office)
- Move date
- Property size (bedrooms, square footage)
- Any special items (pianos, safes, etc.)
- Access details (stairs, elevator)
`,

    painter: `
${basePrompt}

Include:
- Area to be painted (interior/exterior, specific rooms)
- Approximate square footage
- Timing preference
- Whether consultation needed for colors
- Any prep work required
`,

    cleaner: `
${basePrompt}

Include:
- Type of cleaning needed (deep clean, regular, move-in/out)
- Property type (residential/commercial)
- Size (bedrooms/bathrooms or square footage)
- Timing preference
- Any special focus areas or pet considerations
`,

    contractor: `
${basePrompt}

Include:
- Type of project (renovation, repair, new construction)
- Areas affected
- Project timeline
- Budget range (if discussed)
- Permit requirements
`,

    roofer: `
${basePrompt}

Include:
- Type of issue (leak, damage, replacement, inspection)
- When problem was noticed
- Urgency level (Low, Medium, High) - note active leaks
- Property type (residential/commercial)
- Roof age (if known)
- Any storm damage visible
`,
  };

  // Return category-specific prompt or default to plumber
  return categorySpecificPrompts[category] || categorySpecificPrompts.plumber;
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
export function getBusinessTitle(category: BusinessCategory) {
  const titles = {
    plumber: "plumber",
    hvac: "technician",
    electrician: "electrician",
    handyman: "handyman",
    landscaper: "landscaper",
    mover: "mover",
    painter: "painter",
    cleaner: "cleaner",
    contractor: "contractor",
    roofer: "roofer",
  };
  return titles[category] || "professional";
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
