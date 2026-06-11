export const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";
export const AUDIO_FLUSH_INTERVAL = 15;
export const SILENCE_TIMEOUT = 200;
export const WARM_POOL_SIZE = 2;

export const CONFIG = { 
  PORT: process.env.PORT || 4000,
  MONGODB_URL: process.env.MONGODB_URL!,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
  // Fonoster config (corrected)
  FONOSTER_SECRET_ACCESS_KEY: process.env.FONOSTER_SECRET_ACCESS_KEY!,
  FONOSTER_ACCESS_KEY_ID: process.env.FONOSTER_ACCESS_KEY_ID!, // Format: WO00000000000000000000
  FONOSTER_API_KEY: process.env.FONOSTER_API_KEY!, // Your API Key
  FONOSTER_API_SECRET: process.env.FONOSTER_API_SECRET!, // Your API Secret
  FONOSTER_PHONE_NUMBER: process.env.FONOSTER_PHONE_NUMBER!, // Your Fonoster number
  FONOSTER_APP_REF: process.env.FONOSTER_APP_REF!, // Your App UUID
  FONOSTER_ENDPOINT:
    process.env.FONOSTER_ENDPOINT || "https://api.fonoster.com",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN!,
  BUSINESS_PHONE: process.env.TWILIO_PHONE_NUMBER!,
} as const;
