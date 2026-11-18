import api from "@/lib/api";

/**
 * Storefront promotions — the discount engine now runs in the Express
 * backend (`/api/checkout/promotions/*`).
 */

export interface CartItem {
  productId: string;
  variantId?: string;
  categoryIds?: string[];
  brandId?: string;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost?: number;
}

export interface CustomerContext {
  customerId?: string | null;
  customerGroupIds?: string[];
}

export interface ApplicablePromotion {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  icon?: string | null;
  priority: number;
  stackable: boolean;
  calculationType: string;
  discount: number;
  label: string;
  requiresCode: boolean;
}

export interface DiscountResult {
  applied: ApplicablePromotion[];
  excluded: { _id: string; name: string; reason: string }[];
  totalDiscount: number;
  shippingDiscount: number;
  total: number;
}

function emptyResult(cart: Cart): DiscountResult {
  return {
    applied: [],
    excluded: [],
    totalDiscount: 0,
    shippingDiscount: 0,
    total: Math.max(0, cart.subtotal + (cart.shippingCost ?? 0)),
  };
}

export async function previewCartDiscounts(
  cart: Cart,
  ctx: CustomerContext = {},
  codes: string[] = [],
  selectedIds?: string[],
): Promise<DiscountResult> {
  try {
    const res = await api.post<{ data: DiscountResult }>(
      "/checkout/promotions/preview",
      { cart, ctx, codes, selectedIds },
      { timeout: 15_000 },
    );

    return res.data?.data ?? emptyResult(cart);
  } catch (error) {
    console.error("[previewCartDiscounts] failed:", error);
    return emptyResult(cart);
  }
}

export async function validatePromotionCode(
  code: string,
  cart: Cart,
  ctx: CustomerContext = {},
): Promise<
  { ok: true; promotion: ApplicablePromotion } | { ok: false; reason: string }
> {
  try {
    const res = await api.post<{
      data:
        | { ok: true; promotion: ApplicablePromotion }
        | { ok: false; reason: string };
    }>("/checkout/promotions/validate", { code, cart, ctx });

    return res.data?.data ?? { ok: false, reason: "Unable to check this code" };
  } catch (error: any) {
    return {
      ok: false,
      reason:
        error?.response?.data?.error ?? "Unable to check this code",
    };
  }
}
/** Records promotion usage after an order is paid. */
export async function recordPromotionUsage(
  orderId: string,
  applied: { _id: string; discount: number; code?: string }[],
  customerId?: string | null,
): Promise<{ recorded: number }> {
  try {
    const res = await api.post<{ data: { recorded: number } }>(
      "/checkout/promotions/usage",
      { orderId, applied, customerId },
    );
    return res.data?.data ?? { recorded: 0 };
  } catch (error) {
    console.error("[recordPromotionUsage] failed:", error);
    return { recorded: 0 };
  }
}
