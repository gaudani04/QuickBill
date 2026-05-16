import mongoose from "mongoose";

const shopSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "default", unique: true },
    businessName: { type: String, trim: true, default: "My Retail Shop" },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    taxId: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const ShopSettings = mongoose.model("ShopSettings", shopSettingsSchema);

export async function getShopSettings() {
  let doc = await ShopSettings.findOne({ singleton: "default" });
  if (!doc) {
    doc = await ShopSettings.create({ singleton: "default" });
  }
  return doc;
}
