import { Router } from "express";
import * as d from "../controllers/dashboardController.js";
import { attachUser, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.get("/summary", d.dashboardSummary);

export default router;
