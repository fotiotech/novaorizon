// lib/api/products.server.ts
//
// Server-side wrapper around the public catalogue + admin product endpoints.
// Replaces the old `app/actions/products.ts` server-action layer: Server
// Components and Route Handlers call the Express API directly through
// `@/lib/server-api`, which forwards the browser's session cookies and caps
// every request at 10s.
//
// Reads never throw: a build or prerender where the API is unreachable
// degrades to empty data instead of failing the render.
import "server-only";

import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

/** Matches a 24-char Mongo ObjectId hex string. */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** Public list page size (the backend caps `pageSize` at 100). */
const PAGE_SIZE = 100;

/** Safety net so a malformed `totalPages` can never loop forever. */
const MAX_PAGES = 50;

/**
 * Normalize anything that looks like an id into a string, or return null.
 * Handles plain strings/numbers, Mongo extended JSON `{ $oid }` and plain
 * objects `{ _id }` / `{ id }`. The API returns plain string ids, so this is
 * mostly a guard against legacy payloads.
 */
function normalizeId(input: any): string | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed || null;
  }
  if (typeof input === "number") return String(input);

  if (typeof input === "object") {
    if (typeof input.toHexString === "function") {
      try {
        return input.toHexString();
      } catch {
        /* fall through */
      }
    }
    if (input._id !== undefined && input._id !== null) {
      return normalizeId(input._id);
    }
    if (input.$oid !== undefined && input.$oid !== null) {
      return normalizeId(input.$oid);
    }
    if (input.id !== undefined && input.id !== null) {
      return normalizeId(input.id);
    }
  }

  return null;
}

function isObjectIdString(s: string | null): s is string {
  return !!s && OBJECT_ID_RE.test(s);
}

interface PublicProductPage {
  products?: any[];
  total?: number;
  totalPages?: number;
}

async function fetchPublicProductPage(
  categoryId: string | null,
  page: number,
  cache: RequestCache,
): Promise<{ products: any[]; totalPages: number }> {
  const result = await apiData<PublicProductPage>("/catalog/products", {
    query: {
      page,
      pageSize: PAGE_SIZE,
      sort: "createdAt",
      ...(categoryId ? { categoryId } : {}),
    },
    cache,
  });

  return {
    products: Array.isArray(result?.products) ? result.products : [],
    totalPages: Math.max(1, Number(result?.totalPages) || 1),
  };
}

/** Walks every public catalogue page so the old "find all" semantics survive. */
async function listAllPublicProducts(
  options: { categoryId?: string | null; cache?: RequestCache } = {},
): Promise<any[]> {
  const { categoryId = null, cache = "no-store" } = options;

  const all: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchPublicProductPage(categoryId, page, cache);
    all.push(...result.products);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return all;
}

// ---------- Queries ----------

/**
 * Every product whose `categoryId` is one of `id` (the caller passes the
 * selected category plus all of its descendants). The public catalogue accepts
 * a single `categoryId` per request, so the scopes are fetched one by one and
 * merged, preserving the old "newest first" ordering.
 */
export async function findProductByCategory(
  id: string | string[],
): Promise<any> {
  try {
    const rawIds = Array.isArray(id) ? id : [id];
    const ids = rawIds
      .map((v) => normalizeId(v))
      .filter((v): v is string => isObjectIdString(v));

    if (ids.length === 0) return [];

    const byId = new Map<string, any>();

    for (const categoryId of ids) {
      // The category page is ISR-cached (revalidate = 3600); match the
      // force-cache pattern used by the other statically rendered pages.
      const products = await listAllPublicProducts({
        categoryId,
        cache: "force-cache",
      });
      for (const product of products) {
        if (product?._id !== undefined) byId.set(String(product._id), product);
      }
    }

    // Same order the old `.sort({ createdAt: -1 })` produced.
    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(b?.createdAt ?? 0).getTime() -
        new Date(a?.createdAt ?? 0).getTime(),
    );
  } catch (error: any) {
    console.error("[findProductByCategory] Error:", error);
    return {
      error: error?.message || "Failed to fetch products by category",
    };
  }
}

export async function findProducts(id?: string): Promise<any> {
  try {
    if (id !== undefined) {
      const idStr = normalizeId(id);

      // Reject before the API sees the value — same guard as the old action.
      if (!isObjectIdString(idStr)) {
        return { success: false, error: "Invalid product id" };
      }

      const product = await apiData<any>(
        `/catalog/products/${encodeURIComponent(idStr)}`,
      );

      if (!product) return { success: false, error: "Product not found" };

      // Rebuild the populated `relatedProducts` shape the old action returned:
      // { product: { _id, name, price, image, slug }, relationshipType }.
      let relatedProducts: any[] = [];
      const relatedRefs: any[] = Array.isArray(product.relatedProducts)
        ? product.relatedProducts
        : [];

      if (relatedRefs.length > 0) {
        const relatedIds: string[] = relatedRefs
          .map((rp: any) => normalizeId(rp?.product))
          .filter((rid: string | null): rid is string => isObjectIdString(rid));

        if (relatedIds.length > 0) {
          try {
            const docs = await Promise.all(
              relatedIds.map((rid) =>
                apiData<any>(
                  `/catalog/products/${encodeURIComponent(rid)}`,
                ).catch(() => null),
              ),
            );

            const docMap = new Map<string, any>(
              docs
                .filter(Boolean)
                .map((doc: any) => [String(doc._id), doc] as [string, any]),
            );

            relatedProducts = relatedRefs
              .map((rp: any) => {
                const key = normalizeId(rp?.product);
                const doc = key ? docMap.get(key) : null;
                if (!doc) return null;
                return {
                  product: {
                    _id: String(doc._id),
                    name: doc.name,
                    price: doc.price,
                    image: doc.images?.[0] || "",
                    slug: doc.slug,
                  },
                  relationshipType: rp.relationshipType || "",
                };
              })
              .filter((rp: any) => rp !== null);
          } catch (e) {
            console.warn("Failed to populate related products:", e);
          }
        }
      }

      return { ...product, relatedProducts };
    }

    const products = await listAllPublicProducts();

    if (!products || products.length === 0) return [];

    return products;
  } catch (error: any) {
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Product not found" };
    }
    console.error("[findProducts] Error:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch products",
    };
  }
}

/** Fed to `app/api/sitemap/route.ts`; never throws during a static build. */
export async function findProductsForSitemap() {
  try {
    const products = await listAllPublicProducts({ cache: "force-cache" });

    return products.map((p: any) => ({
      url_slug: p.slug,
      dsin: p.sku,
      updated_at: p.updatedAt,
    }));
  } catch (error) {
    console.error("[findProductsForSitemap] Error:", error);
    return [] as Array<{ url_slug: any; dsin: any; updated_at: any }>;
  }
}

export async function deleteProduct(id: string) {
  // Keep the authorization guard the old action had.
  await requireAdmin();

  const idStr = normalizeId(id);
  if (!isObjectIdString(idStr)) {
    return { success: false, error: "Invalid product id" };
  }

  try {
    await apiFetch(`/products/${encodeURIComponent(idStr)}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      return { success: false, error: "Product not found" };
    }
    console.error("[deleteProduct] Error:", e);
    return {
      success: false,
      error: e?.message || "Failed to delete product",
    };
  }
}
