import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { ShopSettings } from "../models/ShopSettings.js";

dotenv.config();

async function run() {
  await mongoose.connect(env.mongoUri);
  const email = process.env.SEED_ADMIN_EMAIL || "admin@shop.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";

  let admin = await User.findOne({ email });
  if (!admin) {
    const passwordHash = await bcrypt.hash(password, 12);
    admin = await User.create({
      email,
      passwordHash,
      name: "Shop Admin",
      role: "admin",
    });
    console.log("Created admin:", email, "| password:", password);
  } else {
    console.log("Admin exists:", email);
  }

  let staff = await User.findOne({ email: "staff@shop.local" });
  if (!staff) {
    await User.create({
      email: "staff@shop.local",
      passwordHash: await bcrypt.hash("staff12345", 12),
      name: "Counter Staff",
      role: "staff",
    });
    console.log("Created staff: staff@shop.local | password: staff12345");
  }

  await ShopSettings.findOneAndUpdate(
    { singleton: "default" },
    {
      $setOnInsert: {
        singleton: "default",
        businessName: "QuickBill Demo Shop",
        address: "123 Market Street",
        phone: "+91-9000000000",
        email: "shop@example.com",
        taxId: "",
      },
    },
    { upsert: true }
  );

  const cats = ["Stationery", "Electronics", "Accessories"];
  for (const name of cats) {
    await Category.findOneAndUpdate({ name }, { $setOnInsert: { name } }, { upsert: true });
  }

  const stationery = await Category.findOne({ name: "Stationery" });
  const electronics = await Category.findOne({ name: "Electronics" });

  if (stationery && !(await Product.exists({ sku: "NB-A4-001" }))) {
    await Product.create({
      name: "A4 Notebook",
      sku: "NB-A4-001",
      category: stationery._id,
      buyingPrice: 40,
      sellingPrice: 65,
      quantity: 50,
      barcode: "8901000111222",
      lowStockThreshold: 10,
    });
  }
  if (electronics && !(await Product.exists({ sku: "USB-C-1M" }))) {
    await Product.create({
      name: "USB-C Cable 1m",
      sku: "USB-C-1M",
      category: electronics._id,
      buyingPrice: 120,
      sellingPrice: 199,
      quantity: 30,
      barcode: "8901000333444",
      lowStockThreshold: 5,
    });
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
