import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupRoutes } from "./routes";
import { setupWebSocket } from "./websocket/handlers";
import { errorHandler } from "./middleware/error.middleware";
import { GeminiService } from "./services/gemini.service"; // Import the service
import { CONFIG, WARM_POOL_SIZE } from "./config/constants";
import { greeting, startNgrok } from "./utils";
import mongoose from "mongoose";
import { PromptService } from "./services/prompt.service";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/media-stream" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup routes and WebSocket
setupRoutes(app);
setupWebSocket(wss);

// Error handling middleware
app.use(errorHandler);

async function start() {
  const ngrokUrl = await startNgrok(CONFIG.PORT);
  const systemPrompt = PromptService.generateForBusiness("", ""); // no callerNumber needed

  await GeminiService.generateGreeting(greeting);
  await GeminiService.initPool(systemPrompt, 2); // blocks until both sessions are warm
  await mongoose
    .connect(CONFIG.MONGODB_URL)
    .then(() => {
      server.listen(CONFIG.PORT, () => {
        console.log("🚀 Server Connected & Started:", ngrokUrl);
      });
    })
    .catch((err) => {
      server.listen(CONFIG.PORT, () => {
        console.log("🚀 Error Connecting Server:", err);
      });
    });

  // // Warm up Gemini sessions - using the service method
  // for (let i = 0; i < WARM_POOL_SIZE; i++) {
  //   await GeminiService.warmGeminiSession();
  // }
}

start().catch(console.error);

// renit48980@pckage.com
// yidawit403@keecs.com
// ps: Twilio!@#$d2Test
// GS1TG8NHC2MM63JV3KTJ8JX4
// 5M4RR2LQU2T1PD86M9WFMEM9
