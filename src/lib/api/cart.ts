import api from "@/lib/api";

/**
 * Cart — `/api/cart`.
 *
 * Identity is cookie-based on the server: the `cart_sid` cookie identifies a
 * guest cart, the session cookie identifies a signed-in customer.
 */

export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

export interface CartIdentifier {
  userId?: string;
  sessionId?: string;
}

function messageOf(error: any, fallback: string): string {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.fieldErrors?._form?.[0] ??
    error?.message ??
    fallback
  );
}

export async function getCart(_identifier?: CartIdentifier): Promise<any> {
  try {
    const res = await api.get<{ data: any }>("/cart");
    return res.data?.data ?? null;
  } catch (error) {
    console.error("[getCart] failed:", error);
    return null;
  }
}

export async function mergeGuestSessionData(_args?: {
  guestId?: string;
  sessionId?: string;
  userId?: string;
}): Promise<{ success: boolean; merged: boolean }> {
  try {
    const res = await api.post<{ success?: boolean; merged?: boolean }>(
      "/cart/merge",
    );
    return { success: true, merged: Boolean(res.data?.merged) };
  } catch {
    return { success: false, merged: false };
  }
}

export async function addToCart(
  _identifier: CartIdentifier,
  input: CartItemInput,
): Promise<{ success: true; cart: any }> {
  try {
    const res = await api.post<{ data: any }>("/cart/items", {
      productId: input.productId,
      variant: input.variant,
      quantity: input.quantity,
    });
    return { success: true, cart: res.data?.data };
  } catch (error: any) {
    throw new Error(messageOf(error, "Unable to add this item to your cart."));
  }
}

export async function updateCartItem(
  _identifier: CartIdentifier,
  itemId: string,
  quantity: number,
): Promise<{ success: true; cart: any }> {
  try {
    const res = await api.patch<{ data: any }>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      { quantity },
    );
    return { success: true, cart: res.data?.data };
  } catch (error: any) {
    throw new Error(messageOf(error, "Unable to update this item."));
  }
}

export async function removeFromCart(
  identifier: CartIdentifier,
  itemId: string,
) {
  return updateCartItem(identifier, itemId, 0);
}

export async function clearCart(
  _identifier?: CartIdentifier,
): Promise<{ success: true; cart: any }> {
  try {
    const res = await api.delete<{ data: any }>("/cart");
    return { success: true, cart: res.data?.data };
  } catch (error: any) {
    throw new Error(messageOf(error, "Unable to clear your cart."));
  }
}

/** Discounts are validated and applied server-side at checkout. */
export async function applyDiscount(
  _identifier?: CartIdentifier,
  _discountValue?: number,
  _couponCode?: string,
): Promise<{ success: boolean; cart?: any; error?: string }> {
  return {
    success: false,
    error: "Discounts are applied automatically at checkout.",
  };
}
