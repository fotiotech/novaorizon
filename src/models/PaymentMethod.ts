import mongoose, { Schema, Document, Model } from "mongoose";
import Address, { IAddress } from "./Address"; // Import Address model

// ------------------ Base Interface ------------------
interface IPaymentMethodBase extends Document {
  userId: mongoose.Types.ObjectId;
  methodType: "CreditCard" | "MobileMoney" | "PayPal";
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ Credit Card (Uses Address Reference) ------------------
interface ICreditCardPaymentMethod extends IPaymentMethodBase {
  methodType: "CreditCard";
  details: {
    cardNumber: string;
    expiryDate: string;
    cardholderName: string;
    billingAddressId: mongoose.Types.ObjectId | IAddress; // Reference to Address
  };
}

// ------------------ Mobile Money (No Address) ------------------
interface IMobileMoneyPaymentMethod extends IPaymentMethodBase {
  methodType: "MobileMoney";
  details: {
    phoneNumber: string;
    provider: "MTN" | "Orange" | "Camtel";
    reference?: string;
  };
}

// ------------------ PayPal (No Address) ------------------
interface IPayPalPaymentMethod extends IPaymentMethodBase {
  methodType: "PayPal";
  details: {
    email: string;
  };
}

// Union type
type IPaymentMethod =
  | ICreditCardPaymentMethod
  | IMobileMoneyPaymentMethod
  | IPayPalPaymentMethod;

// ------------------ Schema Definitions ------------------
const baseOptions = { timestamps: true, discriminatorKey: "methodType" };

const BasePaymentMethodSchema = new Schema<IPaymentMethodBase>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    methodType: {
      type: String,
      required: true,
      enum: ["CreditCard", "MobileMoney", "PayPal"],
    },
  },
  baseOptions,
);

// --- Credit Card Schema (References Address) ---
const CreditCardSchema = new Schema<ICreditCardPaymentMethod>({
  details: {
    cardNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    cardholderName: { type: String, required: true },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address", // <-- Referencing the Address collection
      required: true,
    },
  },
});

// --- Mobile Money Schema (No Address) ---
const MobileMoneySchema = new Schema<IMobileMoneyPaymentMethod>({
  details: {
    phoneNumber: { type: String, required: true },
    provider: {
      type: String,
      required: true,
      enum: ["MTN", "Orange", "Camtel"],
    },
    reference: { type: String },
  },
});

// --- PayPal Schema (No Address) ---
const PayPalSchema = new Schema<IPayPalPaymentMethod>({
  details: {
    email: { type: String, required: true },
  },
});

// ------------------ Model Creation with Discriminators ------------------
const PaymentMethodModel =
  (mongoose.models.PaymentMethod as Model<IPaymentMethodBase>) ||
  mongoose.model<IPaymentMethodBase>("PaymentMethod", BasePaymentMethodSchema);

// Attach discriminators (only once)
const CreditCardPaymentMethod = PaymentMethodModel.discriminator(
  "CreditCard",
  CreditCardSchema,
);
const MobileMoneyPaymentMethod = PaymentMethodModel.discriminator(
  "MobileMoney",
  MobileMoneySchema,
);
const PayPalPaymentMethod = PaymentMethodModel.discriminator(
  "PayPal",
  PayPalSchema,
);

// Exports
export {
  PaymentMethodModel as PaymentMethod,
  CreditCardPaymentMethod,
  MobileMoneyPaymentMethod,
  PayPalPaymentMethod,
};
export type {
  IPaymentMethod,
  ICreditCardPaymentMethod,
  IMobileMoneyPaymentMethod,
  IPayPalPaymentMethod,
};
