import { validationResult } from "express-validator";
import { getShopSettings } from "../models/ShopSettings.js";

export async function getSettings(_req, res, next) {
  try {
    const shop = await getShopSettings();
    res.json(shop);
  } catch (e) {
    next(e);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const shop = await getShopSettings();
    Object.assign(shop, req.body);
    await shop.save();
    res.json(shop);
  } catch (e) {
    next(e);
  }
}
