import api from "@/lib/api";

/** Customer invoices — `/api/checkout/invoices`. */

export async function getInvoiceByOrderNumber(
  orderNumber: string,
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const res = await api.get<{ data: any }>(
      `/checkout/orders/${encodeURIComponent(orderNumber)}/invoice`,
      { timeout: 15_000 },
    );
    return { success: true, invoice: res.data?.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error?.response?.data?.error ??
        error?.message ??
        "Invoice not found.",
    };
  }
}

export async function downloadInvoice(
  invoiceNumber: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await api.get<{ data: any }>(
      `/checkout/invoices/${encodeURIComponent(invoiceNumber)}/download`,
      { timeout: 15_000 },
    );
    return { success: true, data: res.data?.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error?.response?.data?.error ??
        error?.message ??
        "Invoice not found.",
    };
  }
}

export async function getInvoicesByUserId(
  _userId?: string,
  _options?: { page?: number; limit?: number },
): Promise<{ success: boolean; invoices?: any[]; total?: number; error?: string }> {
  // The customer's invoices are reachable through their orders; there is no
  // separate list endpoint on the backend today.
  return { success: true, invoices: [], total: 0 };
}
