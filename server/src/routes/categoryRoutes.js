import { Router } from "express";
import { body, param } from "express-validator";
import * as c from "../controllers/categoryController.js";
import { attachUser, requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.get("/", c.listCategories);

router.post(
  "/",
  requireRole("admin"),
  [
    body("name").trim().notEmpty().isLength({ max: 120 }),
    body("description").optional().trim().isLength({ max: 500 }),
  ],
  c.createCategory
);

router.patch(
  "/:id",
  requireRole("admin"),
  [
    param("id").isMongoId(),
    body("name").optional().trim().notEmpty().isLength({ max: 120 }),
    body("description").optional().trim().isLength({ max: 500 }),
  ],
  c.updateCategory
);

router.delete("/:id", requireRole("admin"), [param("id").isMongoId()], c.deleteCategory);

export default router;
