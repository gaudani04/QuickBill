import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
