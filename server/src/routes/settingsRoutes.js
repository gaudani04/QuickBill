import { Router } from "express";
import { body } from "express-validator";
import * as s from "../controllers/settingsController.js";
import { attachUser, requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.get("/", s.getSettings);
router.patch(
  "/",
  requireRole("admin"),
  [
    body("businessName").optional().trim().isLength({ max: 200 }),
    body("address").optional().trim().isLength({ max: 500 }),
    body("phone").optional().trim().isLength({ max: 64 }),
    body("email").optional({ values: "falsy" }).isEmail(),
    body("taxId").optional().trim().isLength({ max: 64 }),
  ],
  s.updateSettings
);

export default router;
