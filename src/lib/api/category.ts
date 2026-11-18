// lib/api/category.ts
//
// Client-side wrapper around the public category endpoints. Replaces the
// `getCategoryAttributeSets` server action for Client Components
// (ProductAttributes, SearchClient): the axios instance attaches the session
// cookie, so the attribute sets come straight from the Express API.
import api from "@/lib/api";

/** Matches a 24-char Mongo ObjectId hex string. Client-safe (no mongoose). */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export interface AttributeUnitFamily {
  id: string;
  name: string;
  baseUnit: string;
}

export interface MappedAttribute {
  id: string;
  code: string;
  name: string;
  type: string;
  options: string[];
  isRequired: boolean;
  isHighlight: boolean;
  unitFamily: AttributeUnitFamily | null;
  sortOrder: number;
}

export interface GroupNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: MappedAttribute[];
  children: GroupNode[];
}

/** Shape returned by `GET /api/catalog/categories/:id/attribute-sets`. */
export interface AttributeSetResult {
  id: string;
  title: string;
  code: string;
  sortOrder: number;
  groups: GroupNode[];
}

/**
 * GET /api/catalog/categories/:id/attribute-sets — public.
 *
 * Never throws: the UI renders without the attribute tables when the API is
 * unreachable, and an invalid / missing category has no sets.
 */
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  if (!categoryId || !OBJECT_ID_RE.test(String(categoryId))) return [];

  try {
    const res = await api.get<{ data?: AttributeSetResult[] }>(
      `/catalog/categories/${encodeURIComponent(String(categoryId))}/attribute-sets`,
    );
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[getCategoryAttributeSets] failed:", error);
    return [];
  }
}
