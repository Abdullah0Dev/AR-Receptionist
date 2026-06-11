import { Router } from "express";
import { CallController } from "../controllers/call.controller";

const router = Router();

router.post("/voice", CallController.incomingCall);
// router.post("/voice", CallController.voiceWebhook);
router.post("/make-call", CallController.makeOutboundCall);
 
export default router;