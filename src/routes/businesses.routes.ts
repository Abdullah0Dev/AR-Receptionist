// routes/business.routes.ts
import { Router } from "express";
import { BusinessController } from "../controllers/business.controller";
import { LeadController } from "../controllers/lead.controller";

const router = Router();

// CRUD for businesses
router.get("/businesses", BusinessController.getAll);
router.get("/businesses/:id", BusinessController.getOne);
router.get("/businesses/:businessId/leads", LeadController.getByBusinessId);
router.post("/businesses", BusinessController.create);
router.put("/businesses/:id", BusinessController.update);
router.delete("/businesses/:id", BusinessController.delete);

export default router;
