import { validationResult } from "express-validator";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { parsePagination, paginationMeta } from "../utils/pagination.js";

export async function listCategories(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = (req.query.search || "").trim();
    const filter = q ? { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } : {};
    const [items, total] = await Promise.all([
      Category.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Category.countDocuments(filter),
    ]);
    res.json({ items, meta: paginationMeta(total, page, limit) });
  } catch (e) {
    next(e);
  }
}

export async function createCategory(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (e) {
    next(e);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (e) {
    next(e);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const inUse = await Product.exists({ category: req.params.id });
    if (inUse) {
      return res.status(400).json({
        message: "Cannot delete category while products are assigned to it",
      });
    }
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
