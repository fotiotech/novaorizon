// lib/api/category.server.ts
//
// Server-side wrapper around the public category endpoints. Replaces the old
// `app/actions/category.ts` server-action layer: Server Components and Route
// Handlers call the Express API directly through `@/lib/server-api`, which
// forwards the browser's session cookies and caps every request at 10s.
//
// Reads never throw: a build or prerender where the API is unreachable
// degrades to empty/default data instead of failing the render.
import "server-only";

import type { AttributeSetResult } from "@/lib/api/category";
import { ApiError, apiData } from "@/lib/server-api";

/** Matches a 24-char Mongo ObjectId hex string. */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

interface CategoryTreeRow {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string[];
  description?: string | null;
  sortOrder?: number | null;
  updatedAt?: string | null;
}

/**
 * GET /api/catalog/categories/tree — public, already sorted by
 * `sortOrder` then `name`. Returns [] when the API is unreachable.
 */
async function loadCategoryTree(
  cache: RequestCache = "no-store",
): Promise<CategoryTreeRow[]> {
  try {
    const rows = await apiData<CategoryTreeRow[]>("/catalog/categories/tree", {
      cache,
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("[category] failed to load category tree:", error);
    return [];
  }
}

/**
 * Effective property resolution (inheritProperty → inheritedProperty snapshot,
 * otherwise the category property) now lives in the backend; this is a thin
 * passthrough to `GET /api/catalog/categories/:id/attribute-sets`.
 */
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  if (!categoryId || !OBJECT_ID_RE.test(String(categoryId))) {
    return [];
  }

  try {
    const sets = await apiData<AttributeSetResult[]>(
      `/catalog/categories/${encodeURIComponent(String(categoryId))}/attribute-sets`,
    );
    return Array.isArray(sets) ? sets : [];
  } catch (error) {
    console.error("[getCategoryAttributeSets] failed:", error);
    return [];
  }
}

/**
 * GET /api/category-properties?id=…&includeReadOnly=true
 *
 * Admin-gated on the backend (the old read hit Mongo directly). Returns the
 * property, null when it does not exist, or the list when no id is given.
 */
export async function getCategoryProperty(
  id?: string,
  options?: { includeReadOnly?: boolean },
): Promise<any> {
  try {
    const data = await apiData<any>("/category-properties", {
      query: {
        id: id || undefined,
        includeReadOnly: options?.includeReadOnly ? true : undefined,
      },
    });

    if (id) return data ?? null;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return id ? null : [];
    }
    console.error("[getCategoryProperty] failed:", error);
    return id ? null : [];
  }
}

/**
 * The old action had four lookup modes:
 *  - `name`     → the category's children
 *  - `id`       → one category (with its property populated)
 *  - `parentId` → that parent's children
 *  - no args    → every category (used by the sitemap)
 *
 * The public API exposes the tree plus a by-id lookup, so the children modes
 * are derived from the tree. Only the sitemap uses the no-arg mode today; the
 * `url_slug` / `updated_at` aliases keep its mapping working.
 */
export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
): Promise<any> {
  if (name) {
    const tree = await loadCategoryTree("force-cache");
    const category = tree.find((c) => String(c.name) === String(name));
    if (!category) return [];
    return tree.filter(
      (c) => c.parentId && String(c.parentId) === String(category._id),
    );
  }

  if (id) {
    if (!OBJECT_ID_RE.test(String(id))) return null;
    try {
      const category = await apiData<any>(
        `/catalog/categories/${encodeURIComponent(String(id))}`,
        { cache: "force-cache" },
      );
      return category ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      console.error("[getCategory] failed:", error);
      return null;
    }
  }

  if (parentId) {
    const tree = await loadCategoryTree("force-cache");
    return tree.filter(
      (c) => c.parentId && String(c.parentId) === String(parentId),
    );
  }

  const tree = await loadCategoryTree("force-cache");
  return tree.map((c) => ({
    ...c,
    url_slug: c.slug,
    updated_at: c.updatedAt ?? null,
  }));
}

// ==================================================================
// LEAN READ FOR TREE RENDERING (no property populate)
// ==================================================================
export async function getCategoriesForTree(): Promise<
  Array<{
    _id: string;
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string[];
    description?: string;
    sortOrder?: number;
    updatedAt?: string;
  }>
> {
  // The category pages wrap this in unstable_cache; force-cache keeps the
  // nested fetch compatible with static rendering.
  const rows = await loadCategoryTree("force-cache");

  // Preserve the exact shape the category pages' `CategoryNode` expects —
  // the API serializes absent values as `null`.
  return rows.map((c: any) => ({
    _id: String(c._id),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
    parentId: c.parentId ? String(c.parentId) : null,
    imageUrl: Array.isArray(c.imageUrl) ? c.imageUrl.map(String) : [],
    description: c.description ?? undefined,
    sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : undefined,
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : undefined,
  }));
}
