import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    change: { type: Number, required: true },
    previousQty: { type: Number, required: true, min: 0 },
    newQty: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["sale", "restock", "adjustment", "create"],
      required: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ createdAt: -1 });

export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);
