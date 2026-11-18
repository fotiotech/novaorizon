import api from "@/lib/api";

/**
 * Storefront search — `/api/search/*`.
 * The Atlas text/vector engines now run in the Express backend.
 */

export interface SearchHit {
  _id: string;
  _source: any;
  score?: number;
}

export interface SearchResult {
  hits: SearchHit[];
  total: { value: number };
  aggregations?: {
    categories: any[];
    brands: any[];
    priceRange: { min: number; max: number };
  };
}

export interface SemanticSearchFilters {
  categoryId?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  status?: string;
}

const EMPTY: SearchResult = {
  hits: [],
  total: { value: 0 },
  aggregations: { categories: [], brands: [], priceRange: { min: 0, max: 0 } },
};

export async function searchProducts(
  query: string,
  filters: any[] = [],
  page = 1,
  size = 20,
): Promise<SearchResult> {
  try {
    const res = await api.post<{ data: SearchResult }>(
      "/search/products",
      { query, filters, page, size },
      { timeout: 20_000 },
    );
    return res.data?.data ?? EMPTY;
  } catch (error) {
    console.error("[searchProducts] failed:", error);
    return EMPTY;
  }
}

export async function semanticSearch(
  query: string,
  filters: SemanticSearchFilters = {},
  limit = 20,
): Promise<{ hits: SearchHit[]; total: { value: number } }> {
  try {
    const res = await api.post<{ data: { hits: SearchHit[]; total: { value: number } } }>(
      "/search/semantic",
      { query, filters, limit },
      { timeout: 20_000 },
    );
    return res.data?.data ?? { hits: [], total: { value: 0 } };
  } catch (error) {
    console.error("[semanticSearch] failed:", error);
    return { hits: [], total: { value: 0 } };
  }
}

export async function autocompleteProducts(
  query: string,
  limit = 8,
): Promise<any[]> {
  try {
    const res = await api.get<{ data: any[] }>("/search/autocomplete", {
      params: { q: query, limit },
      timeout: 10_000,
    });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[autocompleteProducts] failed:", error);
    return [];
  }
}
