import { Router } from "express";
import { query } from "express-validator";
import * as report from "../controllers/reportController.js";
import { attachUser, requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth, requireRole("admin"));

const dateQuery = [
  query("from")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("from must be YYYY-MM-DD"),
  query("to")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("to must be YYYY-MM-DD"),
];

router.get("/", dateQuery, report.getReport);
router.get("/export", dateQuery, report.exportReport);

export default router;
