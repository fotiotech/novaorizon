// models/PromotionUsage.ts
import { Schema, model, models } from "mongoose";

const promotionUsageSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    // Null for guest checkouts. Per-customer limits only count logged-in users.
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    // Snapshot of what was actually discounted, for reporting.
    discountAmount: { type: Number, required: true, min: 0 },
    // Denormalized for fast aggregation.
    code: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true },
);

// One row per (promotion, order) — a promotion can only be redeemed once per order.
promotionUsageSchema.index({ promotionId: 1, orderId: 1 }, { unique: true });

export const PromotionUsage =
  models.PromotionUsage || model("PromotionUsage", promotionUsageSchema);

export default PromotionUsage;
