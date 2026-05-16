import { Router } from "express";
import { body, param } from "express-validator";
import * as inv from "../controllers/inventoryController.js";
import { attachUser, requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.get("/low-stock", inv.listLowStock);
router.get("/logs", inv.listLogs);

router.post(
  "/restock/:id",
  requireRole("admin"),
  [
    param("id").isMongoId(),
    body("quantity").isInt({ min: 1 }),
    body("note").optional().trim().isLength({ max: 500 }),
  ],
  inv.restock
);

export default router;
