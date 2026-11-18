import api from "@/lib/api";

/**
 * Payment methods — `/api/payment-methods` (signed-in customers).
 * Card payments are disabled server-side; Mobile Money and PayPal only.
 */

export type CreatePaymentMethodResult =
  | { success: true; paymentMethod: Record<string, unknown> }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function errorMessage(error: any, fallback: string): string {
  const payload = error?.response?.data;
  const fieldErrors = payload?.fieldErrors as Record<string, string[]> | undefined;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return first;
  }
  return payload?.error ?? error?.message ?? fallback;
}

export async function createPaymentMethod(
  data: unknown,
  _guestId?: string,
): Promise<CreatePaymentMethodResult> {
  if (
    data &&
    typeof data === "object" &&
    (data as { methodType?: string }).methodType === "CreditCard"
  ) {
    return {
      success: false,
      error:
        "Card payments are not enabled yet. Please use Mobile Money or PayPal.",
    };
  }

  try {
    const res = await api.post<{ data: Record<string, unknown> }>(
      "/payment-methods",
      data,
    );
    return { success: true, paymentMethod: res.data?.data ?? {} };
  } catch (error: any) {
    return {
      success: false,
      error: errorMessage(error, "Unable to save this payment method."),
      fieldErrors: error?.response?.data?.fieldErrors,
    };
  }
}

/**
 * Guest payment methods have no backend equivalent — cart identity on the
 * server is cookie-based. TODO(migration): backend guest payment methods.
 */
export async function mergeGuestPaymentMethods(_args?: {
  guestId?: string;
  userId?: string;
}): Promise<{ success: true; merged: false }> {
  return { success: true, merged: false };
}

export async function getUserPaymentMethods(): Promise<any[]> {
  try {
    const res = await api.get<{ data: any[] }>("/payment-methods");
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[getUserPaymentMethods] failed:", error);
    return [];
  }
}

export async function deletePaymentMethod(
  paymentMethodId: string,
): Promise<{ success: true; message: string }> {
  try {
    await api.delete(
      `/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    );
    return { success: true, message: "Payment method deleted successfully" };
  } catch (error: any) {
    // Preserve the old thrown-Error contract.
    throw new Error(
      error?.response?.status === 404
        ? "Payment method not found or unauthorized"
        : errorMessage(error, "Unable to delete this payment method."),
    );
  }
}

export async function updateCreditCard(
  paymentMethodId: string,
  updates: {
    expiryDate?: string;
    cardholderName?: string;
    billingAddressId?: string;
  },
) {
  try {
    const res = await api.patch<{ data: any }>(
      `/payment-methods/${encodeURIComponent(paymentMethodId)}/card`,
      updates,
    );
    return { success: true, paymentMethod: res.data?.data };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new Error("Credit card not found or unauthorized");
    }
    throw new Error(
      errorMessage(error, "Unable to update this credit card."),
    );
  }
}
