// models/Promotion.ts
import { Schema, model, models } from "mongoose";

const promotionSchema = new Schema(
  {
    promotionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "PromotionType",
      required: true,
      index: true,
    },
    propertyValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Customer-facing code.
    // - Present  → code-gated (customer must type it).
    // - Absent   → auto-applies to any eligible cart.
    // `unique + sparse` gives us a unique index that ignores docs where
    // `code` is missing. Do NOT also declare a separate
    // `promotionSchema.index({ code: 1 })` — that would be a second,
    // non-unique index on the same field.
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },

    customerEligibility: {
      allCustomers: { type: Boolean, default: true },
      customerGroupIds: [{ type: Schema.Types.ObjectId, ref: "CustomerGroup" }],
      minOrderAmount: { type: Number, default: 0 },
    },
    usageLimits: {
      totalUses: { type: Number, default: null },
      perCustomer: { type: Number, default: null },
      perOrder: { type: Number, default: 1 },
    },
    stackable: { type: Boolean, default: false },
    exclusiveWith: [{ type: Schema.Types.ObjectId, ref: "Promotion" }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Primary lookup for the storefront's `getApplicablePromotions`:
// filter on { isActive, startDate, endDate }.
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Secondary lookup for `validatePromotionCode` (code path).
// The unique+sparse index on the field already covers `{ code: 1 }`,
// so no extra index is needed here.

export const Promotion =
  models.Promotion || model("Promotion", promotionSchema);

export default Promotion;
