import { Router } from "express";
import { body, param } from "express-validator";
import * as p from "../controllers/productController.js";
import { attachUser, requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.get("/", p.listProducts);
router.get("/:id", [param("id").isMongoId()], p.getProduct);

const productBody = [
  body("name").trim().notEmpty().isLength({ max: 200 }),
  body("sku").trim().notEmpty().isLength({ max: 64 }),
  body("category").isMongoId(),
  body("buyingPrice").isFloat({ min: 0 }),
  body("sellingPrice").isFloat({ min: 0 }),
  body("quantity").isInt({ min: 0 }),
  body("barcode").optional().trim().isLength({ max: 64 }),
  body("lowStockThreshold").optional().isInt({ min: 0 }),
];

router.post("/", requireRole("admin"), productBody, p.createProduct);

router.patch(
  "/:id",
  requireRole("admin"),
  [param("id").isMongoId()],
  [
    body("name").optional().trim().notEmpty().isLength({ max: 200 }),
    body("sku").optional().trim().notEmpty().isLength({ max: 64 }),
    body("category").optional().isMongoId(),
    body("buyingPrice").optional().isFloat({ min: 0 }),
    body("sellingPrice").optional().isFloat({ min: 0 }),
    body("quantity").optional().isInt({ min: 0 }),
    body("barcode").optional().trim().isLength({ max: 64 }),
    body("lowStockThreshold").optional().isInt({ min: 0 }),
  ],
  p.updateProduct
);

router.delete("/:id", requireRole("admin"), [param("id").isMongoId()], p.deleteProduct);

export default router;
