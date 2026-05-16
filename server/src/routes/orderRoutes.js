import { Router } from "express";
import { body, param } from "express-validator";
import * as o from "../controllers/orderController.js";
import * as inv from "../controllers/invoiceController.js";
import { attachUser, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(attachUser(), requireAuth);

router.post(
  "/",
  [
    body("customerName").trim().notEmpty().isLength({ max: 120 }),
    body("customerPhone").optional().trim().isLength({ max: 32 }),
    body("customerEmail").optional({ values: "falsy" }).isEmail(),
    body("discountAmount").optional().isFloat({ min: 0 }),
    body("taxPercent").optional().isFloat({ min: 0, max: 100 }),
    body("paymentMode").isIn(["cash", "upi", "card"]),
    body("items").isArray({ min: 1 }),
    body("items.*.productId").isMongoId(),
    body("items.*.quantity").isInt({ min: 1 }),
  ],
  o.createOrder
);

router.get("/", o.listOrders);
router.get("/:id/pdf", [param("id").isMongoId()], inv.streamInvoicePdf);
router.get("/:id", [param("id").isMongoId()], o.getOrder);

export default router;
