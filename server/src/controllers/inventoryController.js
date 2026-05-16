import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { parsePagination, paginationMeta } from "../utils/pagination.js";

export async function restock(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const { quantity, note } = req.body;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ message: "Quantity must be a positive integer" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await Product.findById(req.params.id).session(session);
      if (!product || !product.active) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Product not found" });
      }
      const previousQty = product.quantity;
      product.quantity += qty;
      await product.save({ session });
      await InventoryLog.create(
        [
          {
            product: product._id,
            change: qty,
            previousQty,
            newQty: product.quantity,
            reason: "restock",
            user: req.user._id,
            note: note || "",
          },
        ],
        { session }
      );
      await session.commitTransaction();
      await product.populate("category", "name");
      res.json(product);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (e) {
    next(e);
  }
}

export async function listLowStock(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      active: true,
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
    };
    const [items, total] = await Promise.all([
      Product.find(filter).populate("category", "name").sort({ quantity: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ items, meta: paginationMeta(total, page, limit) });
  } catch (e) {
    next(e);
  }
}

export async function listLogs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const productId = req.query.product;
    const filter = {};
    if (productId && mongoose.isValidObjectId(productId)) {
      filter.product = productId;
    }
    const [items, total] = await Promise.all([
      InventoryLog.find(filter)
        .populate("product", "name sku quantity")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryLog.countDocuments(filter),
    ]);
    res.json({ items, meta: paginationMeta(total, page, limit) });
  } catch (e) {
    next(e);
  }
}
