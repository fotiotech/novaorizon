import "server-only";

const WIDGET_BASE = "https://api.monetbil.com/widget/v2.1";
const CHECK_BASE = "https://api.monetbil.com/payment/v1";

export function monetbilServiceKey(): string | null {
  return (
    process.env.MONETBIL_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_MONETBIL_KEY ??
    null
  );
}

export interface MonetbilLinkInput {
  amount: number;
  orderNumber: string;
  operator: string;
  phone?: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function createMonetbilPaymentLink(
  input: MonetbilLinkInput,
): Promise<{ paymentUrl: string }> {
  const key = monetbilServiceKey();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!key) throw new Error("Mobile money is not configured.");
  if (!appUrl) throw new Error("Application URL is not configured.");

  const response = await fetch(`${WIDGET_BASE}/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amount),
      phone: input.phone || undefined,
      locale: "en",
      operator: input.operator,
      country: "CM",
      currency: "XAF",
      item_ref: input.orderNumber,
      payment_ref: input.orderNumber,
      user: `${input.firstName} ${input.lastName}`.trim(),
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      return_url: `${appUrl}/checkout/payment/success?payment_ref=${encodeURIComponent(
        input.orderNumber,
      )}`,
      notify_url: `${appUrl}/api/payments/monetbil`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error("Mobile money provider is unavailable.");
  }

  const data: any = await response.json().catch(() => null);
  if (!data?.success || typeof data.payment_url !== "string") {
    throw new Error(data?.message || "Could not create the payment link.");
  }
  return { paymentUrl: data.payment_url };
}

export interface MonetbilTransaction {
  status: number;
  amount?: number;
  currency?: string;
  payment_ref?: string;
  transaction_UUID?: string;
}

/**
 * Server-to-server verification. The callback body is never trusted on its
 * own; the gateway is asked for the transaction status before an order is
 * marked paid.
 */
export async function checkMonetbilPayment(
  paymentId: string,
): Promise<MonetbilTransaction | null> {
  const response = await fetch(`${CHECK_BASE}/checkPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return null;
  const data: any = await response.json().catch(() => null);
  const transaction = data?.transaction;
  if (!transaction) return null;

  return {
    status: Number(transaction.status),
    amount: Number(transaction.amount),
    currency: transaction.currency,
    payment_ref: transaction.payment_ref,
    transaction_UUID: transaction.transaction_UUID,
  };
}
