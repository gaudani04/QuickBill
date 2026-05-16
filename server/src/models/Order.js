import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitBuyingPrice: { type: Number, required: true, min: 0 },
    unitSellingPrice: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerPhone: { type: String, trim: true, maxlength: 32, default: "" },
    customerEmail: { type: String, trim: true, maxlength: 254, default: "" },
    items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, "Items required"] },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card"],
      required: true,
    },
    profitAmount: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
