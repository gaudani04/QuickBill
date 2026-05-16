import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { User } from "../models/User.js";
import {
  clearAuthCookie,
  setAuthCookie,
  signToken,
} from "../middleware/authMiddleware.js";

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid input", errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!user || !user.active) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user._id.toString());
    setAuthCookie(res, token);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
}
