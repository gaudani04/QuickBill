import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { nextInvoiceNumber } from "../models/InvoiceCounter.js";
import { parsePagination, paginationMeta } from "../utils/pagination.js";

export async function createOrder(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      items: rawItems,
      discountAmount = 0,
      taxPercent = 0,
      paymentMode,
    } = req.body;

    const discount = Math.max(0, Number(discountAmount));
    const taxPct = Math.min(100, Math.max(0, Number(taxPercent)));

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const lines = [];
      let subtotal = 0;
      let costTotal = 0;
      const pendingLogs = [];

      for (const row of rawItems) {
        const pid = row.productId;
        const qty = Number(row.quantity);
        if (!mongoose.isValidObjectId(pid)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: "Invalid product id" });
        }
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: "Each item needs a positive integer quantity" });
        }

        const updated = await Product.findOneAndUpdate(
          { _id: pid, active: true, quantity: { $gte: qty } },
          { $inc: { quantity: -qty } },
          { session, new: true }
        );

        if (!updated) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: "Insufficient stock or product unavailable",
            skuHint: pid,
          });
        }

        const prevQty = updated.quantity + qty;
        const lineSubtotal = updated.sellingPrice * qty;
        subtotal += lineSubtotal;
        costTotal += updated.buyingPrice * qty;

        lines.push({
          productId: updated._id,
          name: updated.name,
          sku: updated.sku,
          quantity: qty,
          unitBuyingPrice: updated.buyingPrice,
          unitSellingPrice: updated.sellingPrice,
          lineSubtotal,
        });

        pendingLogs.push({
          product: updated._id,
          change: -qty,
          previousQty: prevQty,
          newQty: updated.quantity,
          reason: "sale",
          user: req.user._id,
          note: "",
        });
      }

      if (discount > subtotal) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Discount cannot exceed subtotal" });
      }

      const afterDiscount = subtotal - discount;
      const taxAmount = Math.round(afterDiscount * (taxPct / 100) * 100) / 100;
      const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;
      const profitAmount = Math.round((afterDiscount - costTotal) * 100) / 100;

      const invoiceNumber = await nextInvoiceNumber(session);

      const [order] = await Order.create(
        [
          {
            invoiceNumber,
            customerName: customerName.trim(),
            customerPhone: (customerPhone || "").trim(),
            customerEmail: (customerEmail || "").trim(),
            items: lines,
            subtotal,
            discountAmount: discount,
            taxAmount,
            taxPercent: taxPct,
            grandTotal,
            paymentMode,
            profitAmount,
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      await InventoryLog.insertMany(
        pendingLogs.map((l) => ({ ...l, order: order._id })),
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const populated = await Order.findById(order._id).populate("createdBy", "name email");
      res.status(201).json(populated);
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      throw err;
    }
  } catch (e) {
    next(e);
  }
}

export async function listOrders(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = (req.query.search || "").trim();
    const paymentMode = req.query.paymentMode;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const filter = {};
    if (paymentMode && ["cash", "upi", "card"].includes(paymentMode)) {
      filter.paymentMode = paymentMode;
    }
    if (from || to) {
      filter.createdAt = {};
      if (from && !Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
      if (to && !Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
    }
    if (search) {
      filter.$or = [
        { invoiceNumber: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { customerName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ items, meta: paginationMeta(total, page, limit) });
  } catch (e) {
    next(e);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate("createdBy", "name email").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (e) {
    next(e);
  }
}
