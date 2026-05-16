import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not Found — ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    logger.warn({ err: err.message, messages, path: req.path });
    return res.status(400).json({
      message: "Validation failed",
      errors: messages,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    logger.warn({ duplicate: field, path: req.path });
    return res.status(409).json({
      message: `Duplicate value for ${field}`,
      field,
    });
  }

  logger.error({
    err: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    status,
  });

  res.status(status).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
