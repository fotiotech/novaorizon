import api from "@/lib/api";

/**
 * Storefront checkout — `/api/checkout`.
 *
 * The backend recomputes every monetary value (prices, discounts, shipping)
 * from the database; the browser only chooses products, quantities,
 * addresses, a carrier and a payment method.
 */

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variant?: string;
}

export interface CheckoutAddressInput {
  street?: string;
  city?: string;
  region?: string;
  address?: string;
  country?: string;
  carrier?: string;
}

export interface CreateCheckoutOrderInput {
  idempotencyKey?: string;
  items: CheckoutItemInput[];
  appliedCodes?: string[];
  carrierId?: string;
  shippingAddress: CheckoutAddressInput;
  billingAddress?: CheckoutAddressInput;
  billingAddressId?: string | null;
  paymentMethod: string;
  paymentMethodId?: string | null;
  guest?: { firstName?: string; lastName?: string; email?: string };
  notes?: string;
}

export interface CheckoutOrderSummary {
  orderNumber: string;
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
    carrier?: string;
  };
  billingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
  };
  createdAt?: string;
  paidAt?: string;
}

function messageOf(error: any, fallback: string): string {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.message ??
    fallback
  );
}

export async function createCheckoutOrderAction(
  input: CreateCheckoutOrderInput,
): Promise<
  | { success: true; order: CheckoutOrderSummary; reused: boolean }
  | { success: false; error: string }
> {
  try {
    const res = await api.post<{
      data: { order: CheckoutOrderSummary; reused: boolean };
    }>("/checkout/orders", input);

    return {
      success: true,
      order: res.data.data.order,
      reused: Boolean(res.data.data.reused),
    };
  } catch (error: any) {
    console.error("[createCheckoutOrder] failed:", error);
    return {
      success: false,
      error: messageOf(error, "Unable to create the order."),
    };
  }
}

export async function getCheckoutOrderAction(
  orderNumber: string,
): Promise<CheckoutOrderSummary | null> {
  try {
    const res = await api.get<{ data: CheckoutOrderSummary }>(
      `/checkout/orders/${encodeURIComponent(orderNumber)}`,
      { timeout: 15_000 },
    );
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export async function startMonetbilPayment(
  orderNumber: string,
  operator: string,
): Promise<{ paymentUrl: string; amount: number }> {
  try {
    const res = await api.post<{ data: { paymentUrl: string; amount: number } }>(
      `/checkout/orders/${encodeURIComponent(orderNumber)}/pay`,
      { operator },
    );
    return res.data.data;
  } catch (error: any) {
    throw new Error(messageOf(error, "Unable to start the payment."));
  }
}
