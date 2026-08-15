"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/app/auth";

// Import your models and connection utility
import { connection } from "@/utils/connection"; // Adjust path to your DB connection
import Address from "@/models/Address";
import {
  PaymentMethod,
  CreditCardPaymentMethod,
  MobileMoneyPaymentMethod,
} from "@/models/PaymentMethod";

// ------------------ Authentication Helper ------------------
// Replace this with your actual auth logic (NextAuth, Clerk, etc.)
async function getAuthenticatedUser() {
  // Example placeholder:
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ------------------ Validation Schemas (Zod) ------------------

// Payment Method Base Schema (Discriminated Union)
const paymentMethodSchema = z.discriminatedUnion("methodType", [
  // Credit Card
  z.object({
    methodType: z.literal("CreditCard"),
    details: z.object({
      cardNumber: z.string().min(1, "Card number is required"),
      expiryDate: z.string().min(1, "Expiry date is required"),
      cardholderName: z.string().min(1, "Cardholder name is required"),
      billingAddressId: z.string().min(1, "Billing address is required"),
    }),
  }),
  // Mobile Money (Cameroon)
  z.object({
    methodType: z.literal("MobileMoney"),
    details: z.object({
      phoneNumber: z
        .string()
        .min(9, "Phone number must be at least 9 digits")
        .max(13, "Phone number is too long"),
      provider: z.enum(["MTN", "Orange", "Camtel"]),
      reference: z.string().optional(),
    }),
  }),
  // PayPal
  z.object({
    methodType: z.literal("PayPal"),
    details: z.object({
      email: z.string().email("Invalid email address"),
    }),
  }),
]);

// ------------------ 2. PAYMENT METHOD ACTIONS ------------------

/**
 * Create a new payment method (Credit Card, Mobile Money, or PayPal).
 * Validates that the billingAddressId belongs to the user (for Credit Cards).
 */
export async function createPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>,
) {
  const userId = await getAuthenticatedUser();
  await connection();

  const validated = paymentMethodSchema.parse(data);

  // --- Extra security & validation for Credit Cards ---
  if (validated.methodType === "CreditCard") {
    const { billingAddressId } = validated.details;

    // Verify the address exists and belongs to this user
    const address = await Address.findOne({
      _id: billingAddressId,
      userId: new Types.ObjectId(userId),
    });

    if (!address) {
      throw new Error("Invalid billing address provided");
    }

    // Create the Credit Card using the specific discriminator model
    const card = new CreditCardPaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "CreditCard",
      details: {
        ...validated.details,
        billingAddressId: new Types.ObjectId(billingAddressId),
      },
    });

    await card.save();

    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(card)) };
  }

  // --- Mobile Money (Cameroon) ---
  if (validated.methodType === "MobileMoney") {
    const mobile = new MobileMoneyPaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "MobileMoney",
      details: validated.details, // phone, provider, optional reference
    });

    await mobile.save();

    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(mobile)) };
  }

  // --- PayPal ---
  if (validated.methodType === "PayPal") {
    // Use the base PaymentMethod model or create a specific discriminator if needed.
    // Since we don't have a PayPal discriminator model variable exported yet,
    // we can use the base model with the discriminator key.
    const paypal = new PaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "PayPal",
      details: validated.details, // { email }
    });

    await paypal.save();

    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paypal)) };
  }

  throw new Error("Unsupported payment method");
}

/**
 * Get all payment methods for the authenticated user.
 * For Credit Cards, it populates the billingAddressId field.
 */
export async function getUserPaymentMethods() {
  const userId = await getAuthenticatedUser();
  await connection();

  const methods = await PaymentMethod.find({
    userId: new Types.ObjectId(userId),
  })
    .populate({
      path: "details.billingAddressId", // Populate the referenced Address
      model: "Address",
    })
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(methods));
}

/**
 * Delete a payment method by ID.
 */
export async function deletePaymentMethod(paymentMethodId: string) {
  const userId = await getAuthenticatedUser();
  await connection();

  const result = await PaymentMethod.findOneAndDelete({
    _id: paymentMethodId,
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new Error("Payment method not found or unauthorized");
  }

  revalidatePath("/profile/payment-methods");

  return { success: true, message: "Payment method deleted successfully" };
}

/**
 * Update an existing Credit Card (e.g., update expiry date, cardholder name, or billing address).
 * Note: Card number updates usually require PCI compliance, so handle with care.
 * We'll allow updating non-sensitive fields safely.
 */
export async function updateCreditCard(
  paymentMethodId: string,
  updates: {
    expiryDate?: string;
    cardholderName?: string;
    billingAddressId?: string;
  },
) {
  const userId = await getAuthenticatedUser();
  await connection();

  // If they want to update the billing address, verify it belongs to the user
  if (updates.billingAddressId) {
    const address = await Address.findOne({
      _id: updates.billingAddressId,
      userId: new Types.ObjectId(userId),
    });
    if (!address) {
      throw new Error("Invalid billing address provided");
    }
  }

  const updatedCard = await CreditCardPaymentMethod.findOneAndUpdate(
    {
      _id: paymentMethodId,
      userId: new Types.ObjectId(userId),
      methodType: "CreditCard", // Ensure it's a credit card
    },
    {
      $set: {
        "details.expiryDate": updates.expiryDate,
        "details.cardholderName": updates.cardholderName,
        "details.billingAddressId": updates.billingAddressId
          ? new Types.ObjectId(updates.billingAddressId)
          : undefined,
      },
    },
    { new: true, runValidators: true },
  ).populate("details.billingAddressId");

  if (!updatedCard) {
    throw new Error("Credit card not found or unauthorized");
  }

  revalidatePath("/profile/payment-methods");

  return {
    success: true,
    paymentMethod: JSON.parse(JSON.stringify(updatedCard)),
  };
}
