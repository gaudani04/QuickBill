import mongoose from "mongoose";

/** Atomic invoice sequence per prefix (e.g. FY2026). */
const invoiceCounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const InvoiceCounter = mongoose.model("InvoiceCounter", invoiceCounterSchema);

export async function nextInvoiceNumber(session = null) {
  const year = new Date().getFullYear();
  const key = `INV-${year}`;
  const opts = { new: true, upsert: true };
  if (session) opts.session = session;
  const doc = await InvoiceCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    opts
  );
  const num = String(doc.seq).padStart(6, "0");
  return `${key}-${num}`;
}
