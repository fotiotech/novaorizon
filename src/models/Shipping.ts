import mongoose, { Schema, Document } from "mongoose";

// Define the Shipping Document Interface
export interface IShipping extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  address: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
  };
  trackingNumber?: string;
  driver: string;
  shippingMethod: "standard" | "express" | "overnight";
  shippingCost: number;
  status:
    | "processing"
    | "assigned"
    | "in_transit"
    | "delivered"
    | "returned"
    | "cancelled";
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Shipping Schema
const ShippingSchema = new Schema<IShipping>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, required: true },
    },
    trackingNumber: { type: String, unique: true },
    driver: { type: String, required: true, default: "Novaorizon" },
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "overnight"],
      required: true,
      default: "standard",
    },
    shippingCost: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "processing",
        "assigned",
        "in_transit",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "processing",
    },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

// Export the Shipping Model
const Shipping =
  mongoose.models.Shipping ||
  mongoose.model<IShipping>("Shipping", ShippingSchema);

export default Shipping;
