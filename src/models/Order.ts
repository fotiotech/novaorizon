// models/Order.ts
import mongoose, { Schema, Document, Model } from "mongoose";

interface Product {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

interface AppliedPromotion {
  promotionId: mongoose.Types.ObjectId;
  /** Snapshots — survive rename/delete of the promotion document. */
  name?: string;
  code?: string;
  discount: number;
}

export interface OrderDocument extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  userId?: mongoose.Types.ObjectId | null;
  guestId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  products: Product[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  paymentStatus:
    | "pending"
    | "cod_pending"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";
  refundAmount?: number;
  returnReason?: string;
  returnRequestedAt?: Date;
  refundedAt?: Date;
  paymentMethod: string;
  transaction_id?: string;
  billingAddressId?: mongoose.Types.ObjectId;
  paymentMethodId?: mongoose.Types.ObjectId;
  billingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
    carrier?: string;
  };
  carrierId?: mongoose.Types.ObjectId;
  shippingStatus: "pending" | "shipped" | "delivered";
  shippingDate?: Date;
  deliveryDate?: Date;
  orderStatus:
    | "pending"
    | "processing"
    | "shipped"
    | "in transit"
    | "completed"
    | "return_requested"
    | "cancelled"
    | "returned";
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
  couponCode?: string;
  discount: number;
  /** Snapshot of every promotion applied to this order, taken at create time. */
  appliedPromotions?: AppliedPromotion[];
}

const OrderSchema = new mongoose.Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    transaction_id: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    guestId: {
      type: String,
      index: true,
      default: null,
    },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "cod_pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentMethod: { type: String, required: true },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: false,
    },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: false,
    },
    billingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, required: true },
    },
    shippingAddress: {
      street: { type: String, required: true },
      region: { type: String, required: true },
      city: { type: String, required: true },
      address: { type: String, required: true },
      carrier: { type: String },
      country: { type: String, required: true },
    },
    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      required: false,
    },
    shippingStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
      default: "pending",
    },
    shippingDate: { type: Date },
    deliveryDate: { type: Date },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "in transit",
        "completed",
        "return_requested",
        "returned",
        "cancelled",
      ],
      default: "processing",
    },
    refundAmount: { type: Number, default: 0 },
    returnReason: { type: String },
    returnRequestedAt: { type: Date },
    refundedAt: { type: Date },
    notes: { type: String },
    couponCode: { type: String },
    discount: { type: Number, default: 0 },

    // Snapshot of what the customer saw at checkout. Written once on
    // order creation; the paid-transition webhook reads it to record
    // redemptions against usage limits. `_id: false` keeps the subdocs
    // lean — we don't need per-row identity, only the values.
    appliedPromotions: [
      {
        _id: false,
        promotionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Promotion",
          required: true,
        },
        name: { type: String, trim: true },
        code: { type: String, trim: true, uppercase: true },
        discount: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true },
);

// Customer's own order list — filters by userId and sorts by createdAt.
OrderSchema.index({ userId: 1, createdAt: -1 });

// Guest order lookup / admin dashboards.
OrderSchema.index({ email: 1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });

const Order: Model<OrderDocument> =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);

export default Order;
