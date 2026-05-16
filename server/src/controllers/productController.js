import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { env } from "../config/env.js";
import { parsePagination, paginationMeta } from "../utils/pagination.js";

export async function listProducts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = (req.query.search || "").trim();
    const category = req.query.category;
    const lowStock = req.query.lowStock === "true";

    const parts = [{ active: true }];
    if (category && mongoose.isValidObjectId(category)) {
      parts.push({ category });
    }
    if (lowStock) {
      parts.push({
        $expr: {
          $lte: [
            "$quantity",
            { $ifNull: ["$lowStockThreshold", env.defaultLowStockThreshold] },
          ],
        },
      });
    }
    if (search) {
      parts.push({ $text: { $search: search } });
    }
    const filter = parts.length > 1 ? { $and: parts } : parts[0];

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .sort(search ? { score: { $meta: "textScore" } } : { updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ items, meta: paginationMeta(total, page, limit) });
  } catch (e) {
    next(e);
  }
}

export async function getProduct(req, res, next) {
  try {
    const p = await Product.findById(req.params.id).populate("category", "name").lean();
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const body = { ...req.body };
    if (body.sku) body.sku = String(body.sku).trim().toUpperCase();
    if (body.lowStockThreshold == null) body.lowStockThreshold = env.defaultLowStockThreshold;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const [product] = await Product.create([body], { session });
      await InventoryLog.create(
        [
          {
            product: product._id,
            change: product.quantity,
            previousQty: 0,
            newQty: product.quantity,
            reason: "create",
            user: req.user._id,
            note: "Initial stock",
          },
        ],
        { session }
      );
      await session.commitTransaction();
      await product.populate("category", "name");
      res.status(201).json(product);
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

export async function updateProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const body = { ...req.body };
    if (body.sku) body.sku = String(body.sku).trim().toUpperCase();

    const product = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).populate("category", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (e) {
    next(e);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
