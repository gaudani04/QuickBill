import { Router } from "express";
import { body } from "express-validator";
import * as auth from "../controllers/authController.js";
import { attachUser, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString().trim().isLength({ min: 6, max: 128 }),
  ],
  auth.login
);

router.post("/logout", auth.logout);
router.get("/me", attachUser(), requireAuth, auth.me);

export default router;
