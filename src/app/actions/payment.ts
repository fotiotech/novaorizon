"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/app/auth";
import { cookies } from "next/headers";

import { connection } from "@/utils/connection";
import Address from "@/models/Address";
import {
  PaymentMethod,
  CreditCardPaymentMethod,
  MobileMoneyPaymentMethod,
  PayPalPaymentMethod,
  MOBILE_MONEY_PROVIDERS,
} from "@/models/PaymentMethod";

// ------------------ Auth helper ------------------
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ------------------ Helpers ------------------

function detectCardType(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Unknown";
}

function parseExpiry(
  expiryDate: string,
): { expiryMonth: string; expiryYear: string } | null {
  const match = expiryDate
    .trim()
    .match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const expiryMonth = match[1];
  const expiryYear = match[2].length === 2 ? `20${match[2]}` : match[2];
  return { expiryMonth, expiryYear };
}

// ------------------ Zod schema (discriminated union) ------------------
const paymentMethodSchema = z.discriminatedUnion("methodType", [
  z.object({
    methodType: z.literal("CreditCard"),
    details: z.object({
      cardNumber: z
        .string()
        .transform((v) => v.replace(/\D/g, ""))
        .refine((v) => v.length >= 13 && v.length <= 19, {
          message: "Card number must be 13–19 digits",
        }),
      expiryDate: z
        .string()
        .regex(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/, "Use MM/YY"),
      cardholderName: z.string().trim().min(1, "Cardholder name is required"),
      billingAddressId: z.string().min(1, "Billing address is required"),
    }),
  }),
  z.object({
    methodType: z.literal("MobileMoney"),
    details: z.object({
      phoneNumber: z
        .string()
        .trim()
        .regex(
          /^(?:\+?237)?6\d{8}$/,
          "Enter a valid Cameroon mobile number (e.g. 699999999)",
        ),
      provider: z.enum(MOBILE_MONEY_PROVIDERS),
      reference: z.string().trim().optional().or(z.literal("")),
    }),
  }),
  z.object({
    methodType: z.literal("PayPal"),
    details: z.object({
      email: z.string().trim().email("Invalid email address"),
    }),
  }),
]);

// ------------------ Result type ------------------
export type CreatePaymentMethodResult =
  | { success: true; paymentMethod: Record<string, unknown> }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

// ------------------ Actions ------------------

/**
 * Create a new payment method (Credit Card, Mobile Money, or PayPal).
 * Returns a structured result so validation messages reach the client.
 */
export async function createPaymentMethod(
  data: unknown,
  guestId?: string,
): Promise<CreatePaymentMethodResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const cookieStore = await cookies();
    const resolvedGuestId = guestId || cookieStore.get("guestId")?.value;

    if (!userId && !resolvedGuestId) {
      return {
        success: false,
        error: "Unauthorized or guest reference missing",
      };
    }

    await connection();

    // --- Validate ---
    const parsed = paymentMethodSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid payment method data",
        fieldErrors,
      };
    }

    const validated = parsed.data;
    const owner = userId
      ? { userId: new Types.ObjectId(userId) }
      : { guestId: resolvedGuestId as string };

    // --- Credit Card ---
    if (validated.methodType === "CreditCard") {
      const { billingAddressId, cardNumber, cardholderName, expiryDate } =
        validated.details;

      if (!Types.ObjectId.isValid(billingAddressId)) {
        return { success: false, error: "Invalid billing address provided" };
      }

      // Verify the address belongs to the active user or guest session
      const address = userId
        ? await Address.findOne({
            _id: billingAddressId,
            userId: new Types.ObjectId(userId),
          })
        : await Address.findOne({
            _id: billingAddressId,
            guestId: resolvedGuestId,
          });

      if (!address) {
        return { success: false, error: "Invalid billing address provided" };
      }

      const expiry = parseExpiry(expiryDate);
      if (!expiry) {
        return { success: false, error: "Expiry date must be in MM/YY format" };
      }

      // Reject expired cards
      const now = new Date();
      const expMonth = Number(expiry.expiryMonth);
      const expYear = Number(expiry.expiryYear);
      if (
        expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
      ) {
        return { success: false, error: "This card has already expired" };
      }

      const last4 = cardNumber.slice(-4);
      const cardType = detectCardType(cardNumber);

      const card = new CreditCardPaymentMethod({
        ...owner,
        methodType: "CreditCard",
        details: {
          cardNumber,
          last4,
          cardType,
          expiryMonth: expiry.expiryMonth,
          expiryYear: expiry.expiryYear,
          expiryDate: `${expiry.expiryMonth}/${expiry.expiryYear.slice(-2)}`,
          cardholderName,
          billingAddressId: new Types.ObjectId(billingAddressId),
        },
      });

      await card.save();

      revalidatePath("/profile/payment-methods");
      revalidatePath("/profile/payment");

      return {
        success: true,
        paymentMethod: JSON.parse(JSON.stringify(card)),
      };
    }

    // --- Mobile Money ---
    if (validated.methodType === "MobileMoney") {
      const { phoneNumber, provider, reference } = validated.details;

      const mobile = new MobileMoneyPaymentMethod({
        ...owner,
        methodType: "MobileMoney",
        details: {
          phoneNumber,
          provider,
          ...(reference ? { reference } : {}),
        },
      });

      await mobile.save();

      revalidatePath("/profile/payment-methods");
      revalidatePath("/profile/payment");

      return {
        success: true,
        paymentMethod: JSON.parse(JSON.stringify(mobile)),
      };
    }

    // --- PayPal ---
    if (validated.methodType === "PayPal") {
      const paypal = new PayPalPaymentMethod({
        ...owner,
        methodType: "PayPal",
        details: { email: validated.details.email },
      });

      await paypal.save();

      revalidatePath("/profile/payment-methods");
      revalidatePath("/profile/payment");

      return {
        success: true,
        paymentMethod: JSON.parse(JSON.stringify(paypal)),
      };
    }

    return { success: false, error: "Unsupported payment method" };
  } catch (err) {
    console.error("[createPaymentMethod] failed:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving the payment method.",
    };
  }
}

/**
 * Merge guest payment methods into an authenticated user's account.
 */
export async function mergeGuestPaymentMethods({
  guestId,
  userId,
}: {
  guestId?: string;
  userId: string;
}) {
  await connection();

  if (!guestId) {
    return { success: true, merged: false };
  }

  const targetUserId = new Types.ObjectId(userId);

  const guestMethods = await PaymentMethod.find({ guestId }).lean();

  for (const guestMethod of guestMethods) {
    const gm = guestMethod as any;

    const duplicate = await PaymentMethod.findOne({
      userId: targetUserId,
      methodType: gm.methodType,
      $or: [
        { "details.email": gm.details?.email },
        { "details.phoneNumber": gm.details?.phoneNumber },
        { "details.cardNumber": gm.details?.cardNumber },
      ],
    });

    if (!duplicate) {
      await PaymentMethod.updateOne(
        { _id: gm._id },
        { $set: { userId: targetUserId }, $unset: { guestId: 1 } },
      );
    } else {
      await PaymentMethod.deleteOne({ _id: gm._id });
    }
  }

  revalidatePath("/profile/payment-methods");
  revalidatePath("/profile/payment");
  return { success: true, merged: true };
}

/**
 * Get all payment methods for the authenticated user.
 */
export async function getUserPaymentMethods() {
  const userId = await getAuthenticatedUser();
  await connection();

  const methods = await PaymentMethod.find({
    userId: new Types.ObjectId(userId),
  })
    .populate({
      path: "details.billingAddressId",
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
  revalidatePath("/profile/payment");

  return { success: true, message: "Payment method deleted successfully" };
}

/**
 * Update a credit card's non-sensitive fields.
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

  if (updates.billingAddressId) {
    if (!Types.ObjectId.isValid(updates.billingAddressId)) {
      throw new Error("Invalid billing address provided");
    }
    const address = await Address.findOne({
      _id: updates.billingAddressId,
      userId: new Types.ObjectId(userId),
    });
    if (!address) {
      throw new Error("Invalid billing address provided");
    }
  }

  const $set: Record<string, unknown> = {};

  if (updates.expiryDate !== undefined) {
    const expiry = parseExpiry(updates.expiryDate);
    if (!expiry) throw new Error("Expiry date must be in MM/YY format");
    $set["details.expiryDate"] =
      `${expiry.expiryMonth}/${expiry.expiryYear.slice(-2)}`;
    $set["details.expiryMonth"] = expiry.expiryMonth;
    $set["details.expiryYear"] = expiry.expiryYear;
  }

  if (updates.cardholderName !== undefined) {
    $set["details.cardholderName"] = updates.cardholderName;
  }

  if (updates.billingAddressId !== undefined) {
    $set["details.billingAddressId"] = new Types.ObjectId(
      updates.billingAddressId,
    );
  }

  if (Object.keys($set).length === 0) {
    throw new Error("No updates provided");
  }

  const updatedCard = await CreditCardPaymentMethod.findOneAndUpdate(
    {
      _id: paymentMethodId,
      userId: new Types.ObjectId(userId),
      methodType: "CreditCard",
    },
    { $set },
    { new: true, runValidators: true },
  ).populate("details.billingAddressId");

  if (!updatedCard) {
    throw new Error("Credit card not found or unauthorized");
  }

  revalidatePath("/profile/payment-methods");
  revalidatePath("/profile/payment");

  return {
    success: true,
    paymentMethod: JSON.parse(JSON.stringify(updatedCard)),
  };
}
