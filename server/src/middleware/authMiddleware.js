import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const COOKIE_NAME = "qb_token";

export function getCookieName() {
  return COOKIE_NAME;
}

export function attachUser() {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) {
        req.user = null;
        return next();
      }
      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.sub).select("-passwordHash").lean();
      req.user = user;
      next();
    } catch {
      req.user = null;
      next();
    }
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,        // REQUIRED for Vercel + Render (HTTPS)
    sameSite: "none",    // REQUIRED for cross-domain
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Parses strings like 8h, 15m, 7d into milliseconds (fallback 8h). */
function parseExpiryToMs(exp) {
  if (typeof exp === "number" && Number.isFinite(exp)) return exp;
  const s = String(exp).trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) return 8 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult =
    u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}
