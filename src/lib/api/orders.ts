import api from "@/lib/api";

/**
 * Customer orders — `/api/checkout/orders`.
 * Always scoped to the signed-in customer or guest by the backend.
 */

export interface OrderListResult {
  orders: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export async function findOrders(options?: {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  carrier?: string;
}): Promise<OrderListResult> {
  const {
    orderNumber,
    page = 1,
    limit = 10,
    orderStatus,
    paymentStatus,
    search,
    dateFrom,
    dateTo,
    carrier,
  } = options || {};

  const res = await api.get<{
    data: { orders: any[]; total: number; totalPages: number; page: number };
  }>("/checkout/orders", {
    params: {
      page,
      limit,
      orderNumber: orderNumber || undefined,
      orderStatus: orderStatus || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
      carrier: carrier || undefined,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
    },
  });

  const d = res.data?.data;
  return {
    orders: Array.isArray(d?.orders) ? d.orders : [],
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? 1,
    currentPage: d?.page ?? page,
  };
}

export async function getOrderByNumber(orderNumber: string) {
  try {
    const res = await api.get<{ data: any }>(
      `/checkout/orders/${encodeURIComponent(orderNumber)}`,
      { timeout: 15_000 },
    );
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export async function requestReturn(
  orderNumber: string,
  reason?: string,
): Promise<{ success: true; order?: any } | { success: false; error: string }> {
  try {
    const res = await api.post<{ data?: any }>(
      `/checkout/orders/${encodeURIComponent(orderNumber)}/return`,
      { reason },
    );
    return { success: true, order: res.data?.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error?.response?.data?.error ?? "Unable to request a return right now.",
    };
  }
}
