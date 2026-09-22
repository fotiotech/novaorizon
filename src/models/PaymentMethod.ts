import mongoose, { Schema, Document, Model } from "mongoose";

// ------------------ Shared constants (single source of truth) ------------------
export const MOBILE_MONEY_PROVIDERS = [
  "CM_MTNMOBILEMONEY",
  "CM_ORANGEMONEY",
  "CM_EUMM",
] as const;

export type MobileMoneyProvider = (typeof MOBILE_MONEY_PROVIDERS)[number];

// ------------------ Base Interface ------------------
interface IPaymentMethodBase extends Document {
  userId?: mongoose.Types.ObjectId | null;
  guestId?: string | null;
  methodType: "CreditCard" | "MobileMoney" | "PayPal";
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ Credit Card (Uses Address Reference) ------------------
interface ICreditCardPaymentMethod extends IPaymentMethodBase {
  methodType: "CreditCard";
  details: {
    cardNumber: string; // stored in full for now (see PCI note)
    last4: string;
    cardType: string; // Visa, Mastercard, Amex, ...
    expiryMonth: string; // "01".."12"
    expiryYear: string; // "2027"
    expiryDate: string; // "MM/YY" convenience / legacy
    cardholderName: string;
    billingAddressId: mongoose.Types.ObjectId;
  };
}

// ------------------ Mobile Money ------------------
interface IMobileMoneyPaymentMethod extends IPaymentMethodBase {
  methodType: "MobileMoney";
  details: {
    phoneNumber: string;
    provider: MobileMoneyProvider;
    reference?: string;
  };
}

// ------------------ PayPal ------------------
interface IPayPalPaymentMethod extends IPaymentMethodBase {
  methodType: "PayPal";
  details: {
    email: string;
  };
}

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
      required: false,
      default: null,
      index: true,
    },
    guestId: {
      type: String,
      index: true,
      default: null,
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
    last4: { type: String, required: true },
    cardType: { type: String, required: true },
    expiryMonth: { type: String, required: true },
    expiryYear: { type: String, required: true },
    expiryDate: { type: String, required: true }, // e.g. "12/25"
    cardholderName: { type: String, required: true },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
  },
});

// --- Mobile Money Schema ---
const MobileMoneySchema = new Schema<IMobileMoneyPaymentMethod>({
  details: {
    phoneNumber: { type: String, required: true },
    provider: {
      type: String,
      required: true,
      enum: [...MOBILE_MONEY_PROVIDERS],
    },
    reference: { type: String },
  },
});

// --- PayPal Schema ---
const PayPalSchema = new Schema<IPayPalPaymentMethod>({
  details: {
    email: { type: String, required: true },
  },
});

// ------------------ Model Creation with Safe Discriminators ------------------
const PaymentMethodModel =
  (mongoose.models.PaymentMethod as Model<IPaymentMethodBase>) ||
  mongoose.model<IPaymentMethodBase>("PaymentMethod", BasePaymentMethodSchema);

let CreditCardModel: Model<ICreditCardPaymentMethod>;
let MobileMoneyModel: Model<IMobileMoneyPaymentMethod>;
let PayPalModel: Model<IPayPalPaymentMethod>;

if (!PaymentMethodModel.discriminators?.CreditCard) {
  CreditCardModel = PaymentMethodModel.discriminator<ICreditCardPaymentMethod>(
    "CreditCard",
    CreditCardSchema,
  );
} else {
  CreditCardModel = PaymentMethodModel.discriminators
    .CreditCard as Model<ICreditCardPaymentMethod>;
}

if (!PaymentMethodModel.discriminators?.MobileMoney) {
  MobileMoneyModel =
    PaymentMethodModel.discriminator<IMobileMoneyPaymentMethod>(
      "MobileMoney",
      MobileMoneySchema,
    );
} else {
  MobileMoneyModel = PaymentMethodModel.discriminators
    .MobileMoney as Model<IMobileMoneyPaymentMethod>;
}

if (!PaymentMethodModel.discriminators?.PayPal) {
  PayPalModel = PaymentMethodModel.discriminator<IPayPalPaymentMethod>(
    "PayPal",
    PayPalSchema,
  );
} else {
  PayPalModel = PaymentMethodModel.discriminators
    .PayPal as Model<IPayPalPaymentMethod>;
}

// ------------------ Exports ------------------
export {
  PaymentMethodModel as PaymentMethod,
  CreditCardModel as CreditCardPaymentMethod,
  MobileMoneyModel as MobileMoneyPaymentMethod,
  PayPalModel as PayPalPaymentMethod,
};

export type {
  IPaymentMethod,
  ICreditCardPaymentMethod,
  IMobileMoneyPaymentMethod,
  IPayPalPaymentMethod,
};
