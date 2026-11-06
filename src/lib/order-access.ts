import "server-only";
import { getAuthUser } from "@/lib/authz";
import { getGuestId } from "@/lib/guest";

export interface OrderIdentity {
  userId?: unknown;
  guestId?: string | null;
}

/**
 * An order is visible to the account that owns it, or to the browser that
 * created it as a guest (HttpOnly guestId cookie). Never trust a userId
 * supplied by the caller.
 */
export async function canAccessOrder(order: OrderIdentity): Promise<boolean> {
  const user = await getAuthUser();
  if (user && order.userId && String(order.userId) === user.id) {
    return true;
  }

  const guestId = await getGuestId();
  return Boolean(guestId && order.guestId && order.guestId === guestId);
}
