// lib/api/products.ts
//
// Client-side wrapper around the public catalogue endpoints. Replaces the old
// `app/actions/products.ts` server-action layer for every Client Component:
// the axios instance (`@/lib/api`) attaches the session cookie, so no server
// round-trip is needed.
import api from "@/lib/api";

/** Matches a 24-char Mongo ObjectId hex string. Client-safe (no mongoose). */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const PAGE_SIZE = 100;

/** Pulls the first message out of the backend error envelope. */
function errorMessage(error: any, fallback: string): string {
  const payload = error?.response?.data;
  if (payload?.fieldErrors && typeof payload.fieldErrors === "object") {
    const first = Object.values(payload.fieldErrors as Record<string, unknown>)
      .flat()
      .find((v) => typeof v === "string" && v.length > 0);
    if (typeof first === "string") return first;
  }
  if (payload?.message) return String(payload.message);
  if (payload?.error) return String(payload.error);
  if (error?.message) return String(error.message);
  return fallback;
}

async function listAllPublicProducts(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await api.get<{
      data?: { products?: any[]; totalPages?: number };
    }>("/catalog/products", {
      params: { page, pageSize: PAGE_SIZE, sort: "createdAt" },
    });
    const data = res.data?.data;
    const products = Array.isArray(data?.products) ? data.products : [];
    all.push(...products);
    totalPages = Math.max(1, Number(data?.totalPages) || 1);
    page += 1;
  } while (page <= totalPages && page <= 50);

  return all;
}

/**
 * Mirrors the old `findProducts` server action:
 *  - with an id → a single product object, or `{ success: false, error }`
 *  - without    → the full list of published products
 */
export async function findProducts(id?: string): Promise<any> {
  try {
    if (id !== undefined) {
      const idStr = String(id ?? "").trim();
      if (!OBJECT_ID_RE.test(idStr)) {
        return { success: false, error: "Invalid product id" };
      }

      const res = await api.get<{ data?: any }>(
        `/catalog/products/${encodeURIComponent(idStr)}`,
      );
      const product = res.data?.data;
      if (!product) return { success: false, error: "Product not found" };

      return product;
    }

    return await listAllPublicProducts();
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return { success: false, error: "Product not found" };
    }
    console.error("[findProducts] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Failed to fetch products"),
    };
  }
}
