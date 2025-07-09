import mongoose, { Schema, Document } from "mongoose";
import {
  Carrier as CarrierType,
  CarrierCoverage,
  ShippingMethod,
} from "@/constant/types/shipping";

// Coverage Area Schema
const CarrierCoverageSchema = new Schema<CarrierCoverage>({
  region: { type: String, required: true },
  country: { type: String, required: true },
  supportedMethods: [
    {
      type: String,
      enum: ["standard", "express", "overnight"],
      required: true,
    },
  ],
  baseRate: { type: Number, required: true, min: 0 },
  rateFactors: {
    weightMultiplier: { type: Number, required: true, default: 1 },
    distanceMultiplier: { type: Number, required: true, default: 1 },
    valueMultiplier: { type: Number, required: true, default: 0.001 }, // 0.1% by default
  },
  restrictions: {
    maxWeight: { type: Number },
    maxDimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    restrictedItems: [{ type: String }],
  },
});

// Method Speeds Schema
const MethodSpeedsSchema = new Schema({
  standard: {
    minDays: { type: Number, required: true },
    maxDays: { type: Number, required: true },
  },
  express: {
    minDays: { type: Number, required: true },
    maxDays: { type: Number, required: true },
  },
  overnight: {
    minDays: { type: Number, required: true },
    maxDays: { type: Number, required: true },
  },
});

// Main Carrier Schema
const CarrierSchema = new Schema<CarrierType>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    coverageAreas: [CarrierCoverageSchema],
    methodSpeeds: { type: MethodSpeedsSchema, required: true },
    active: { type: Boolean, default: true },
    trackingUrlTemplate: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for commonly queried fields
CarrierSchema.index({ code: 1 });
CarrierSchema.index({ active: 1 });
CarrierSchema.index({ "coverageAreas.region": 1, "coverageAreas.country": 1 });

// Validate that method speeds are logical
CarrierSchema.pre("save", function (next) {
  const carrier = this;

  // Validate that minDays is less than or equal to maxDays for each method
  Object.values(carrier.methodSpeeds).forEach((speed) => {
    if (speed.minDays > speed.maxDays) {
      next(new Error("Minimum days cannot be greater than maximum days"));
    }
  });

  next();
});

const Carrier =
  mongoose.models.Carrier ||
  mongoose.model<CarrierType>("Carrier", CarrierSchema);

export default Carrier;
