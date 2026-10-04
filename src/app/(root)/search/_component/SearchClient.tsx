"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterList, Clear } from "@mui/icons-material";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { searchProducts } from "@/app/actions/search";
import { semanticSearch } from "@/app/actions/semanticSearch";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { Prices } from "@/components/cart/Prices";
import { debounce } from "./debounce";
import ListFilter from "./ListFilter";

const ALLOWED_ATTRIBUTE_SETS = new Set<string>([
  "keyFeatures",
  "specifications",
]);

const EXCLUDED_ATTRIBUTE_TYPES = new Set<string>(["file"]);

// Grid page size for the merged list. Matches the keyword page size
// so pagination math stays consistent, but semantic hits fill any
// shortfall.
const PAGE_SIZE = 20;

// ---------- Types ----------
type AttributeDef = {
  code: string;
  name: string;
  options: string[];
};

// ---------- Helpers ----------
const formatAttributeValue = (value: any): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (
    typeof value === "object" &&
    "value" in value &&
    ("unit" in value || (value as any).unit === undefined)
  ) {
    const v = (value as any).value;
    const u = (value as any).unit;
    return u ? `${v} ${u}` : String(v);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const looksLikeUrl = (s: string): boolean =>
  /^https?:\/\//i.test(s) || s.startsWith("data:") || s.length > 200;

function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Matches MongoDB ObjectId hex strings. Client-safe (no mongoose).
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Normalize whatever shape an ObjectId has survived serialization as.
const normalizeId = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "$oid" in v) return String((v as any).$oid);
  return String(v);
};

// Reusable product card.
const ProductCard = ({ id, item }: { id: string; item: any }) => {
  const imageUrl = item?.images?.[0] || null;
  const title = item?.name || item?.title;
  const currency = "F";

  const displayPrice = pickPrice(item?.price, item?.listPrice);
  const numericListPrice = Number(item?.listPrice) || 0;
  const showListPrice = numericListPrice > displayPrice && displayPrice > 0;

  return (
    <Link
      href={`/products/${title?.slice(0, 15) || "product"}/${id}`}
      className="group flex flex-col bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-primary/30"
    >
      {imageUrl ? (
        <div className="relative w-full aspect-square bg-muted/30 overflow-hidden shrink-0">
          <ImageRenderer image={imageUrl} />
        </div>
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">
          No image
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {title || "Untitled"}
        </p>
        {displayPrice > 0 ? (
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-primary font-semibold text-sm">
              <Prices amount={displayPrice} currency={currency} />
            </p>
            {showListPrice && (
              <p className="text-xs text-muted-foreground line-through">
                <Prices amount={numericListPrice} currency={currency} />
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Price on request</p>
        )}
      </div>
    </Link>
  );
};

const SearchClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Basic filters from URL
  const query = searchParams.get("query") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const priceMin = searchParams.get("priceMin") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // State
  const [data, setData] = useState<any[]>([]);
  const [semanticData, setSemanticData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersData, setFiltersData] = useState<any>({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 0 },
  });
  const [totalCount, setTotalCount] = useState(0);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  // Monotonic request id. Guards against a slow semantic call from a
  // previous query overwriting the current one.
  const requestIdRef = useRef(0);

  // ----- Derive the active category for attribute lookup -----
  const derivedCategoryId = useMemo(() => {
    if (category) return category;
    const first = data[0];
    if (!first) return "";
    const raw = first.categoryId ?? first.category_id;
    if (!raw) return "";
    return typeof raw === "object" ? String(raw._id ?? raw) : String(raw);
  }, [category, data]);

  // ----- Fetch attribute definitions -----
  useEffect(() => {
    if (!derivedCategoryId) {
      setAttributeDefs([]);
      return;
    }
    let cancelled = false;
    getCategoryAttributeSets(derivedCategoryId)
      .then((sets) => {
        if (cancelled) return;
        const defMap = new Map<string, AttributeDef>();

        const walk = (group: any) => {
          group.attributes?.forEach((a: any) => {
            if (!a.code) return;
            if (EXCLUDED_ATTRIBUTE_TYPES.has(String(a.type || ""))) return;

            if (!defMap.has(a.code)) {
              defMap.set(a.code, {
                code: a.code,
                name: a.name || a.code,
                options: Array.isArray(a.options)
                  ? a.options.filter((o: any) => !looksLikeUrl(String(o)))
                  : [],
              });
            } else {
              const existing = defMap.get(a.code)!;
              if (Array.isArray(a.options) && a.options.length > 0) {
                existing.options = Array.from(
                  new Set([
                    ...existing.options,
                    ...a.options.filter((o: any) => !looksLikeUrl(String(o))),
                  ]),
                );
              }
            }
          });
          group.children?.forEach(walk);
        };

        sets.forEach((set: any) => {
          const setCode = String(set.code || "");
          if (!ALLOWED_ATTRIBUTE_SETS.has(setCode)) return;
          set.groups?.forEach(walk);
        });

        setAttributeDefs(Array.from(defMap.values()));
      })
      .catch(() => {
        if (!cancelled) setAttributeDefs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [derivedCategoryId]);

  // ----- Filter predicates -----
  const hasNonQueryFilters = useMemo(() => {
    if (category || brand || priceMin || priceMax) return true;
    const params = new URLSearchParams(searchParams.toString());
    for (const [key] of params.entries()) {
      if (key.startsWith("attr_")) return true;
    }
    return false;
  }, [category, brand, priceMin, priceMax, searchParams]);

  const shouldSearch = useMemo(
    () => Boolean(query || hasNonQueryFilters),
    [query, hasNonQueryFilters],
  );

  // ----- Build the keyword filter array from URL params -----
  const buildFilters = useCallback(() => {
    const filters: any[] = [];

    if (category && OBJECT_ID_RE.test(category)) {
      filters.push({ term: { categoryId: category } });
    }
    if (brand && OBJECT_ID_RE.test(brand)) {
      filters.push({ term: { brand: brand } });
    }
    if (priceMin || priceMax) {
      const range: any = {};
      if (priceMin) range.gte = Number(priceMin);
      if (priceMax) range.lte = Number(priceMax);
      filters.push({ range: { price: range } });
    }

    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of params.entries()) {
      if (key.startsWith("attr_")) {
        const attrKey = key.slice("attr_".length);
        if (attrKey) {
          filters.push({ attribute: { key: attrKey, value } });
        }
      }
    }

    return filters;
  }, [category, brand, priceMin, priceMax, searchParams]);

  // ----- Build the semantic filter object from URL params -----
  const buildSemanticFilters = useCallback(() => {
    const f: {
      categoryId?: string;
      brand?: string;
      priceMin?: number;
      priceMax?: number;
    } = {};
    if (category && OBJECT_ID_RE.test(category)) f.categoryId = category;
    if (brand && OBJECT_ID_RE.test(brand)) f.brand = brand;
    if (priceMin) f.priceMin = Number(priceMin);
    if (priceMax) f.priceMax = Number(priceMax);
    return f;
  }, [category, brand, priceMin, priceMax]);

  // ----- Combined debounced search (keyword + semantic in parallel) -----
  const debouncedSearch = useCallback(
    debounce(
      async (
        searchQuery: string,
        keywordFilters: any[],
        semanticFilters: any,
      ) => {
        const reqId = ++requestIdRef.current;

        setIsLoading(true);
        setError(null);

        // Semantic runs in parallel and is skippable for very short
        // queries — a 2-character string has no meaningful embedding
        // signal and just burns a Voyage call.
        const semanticPromise: Promise<{
          hits: any[];
          total: { value: number };
        }> =
          searchQuery.trim().length >= 3
            ? semanticSearch(searchQuery, semanticFilters, 12).catch((err) => {
                console.warn("[semantic] unavailable:", err);
                return { hits: [], total: { value: 0 } };
              })
            : Promise.resolve({ hits: [], total: { value: 0 } });

        try {
          const result = await searchProducts(
            searchQuery,
            keywordFilters,
            page,
            PAGE_SIZE,
          );

          if (reqId !== requestIdRef.current) return;

          const items = result.hits.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
          }));

          setFiltersData({
            categories: result.aggregations?.categories || [],
            brands: result.aggregations?.brands || [],
            priceRange: result.aggregations?.priceRange || { min: 0, max: 0 },
          });
          setData(items);
          setTotalCount(result.total.value || 0);

          // Keyword grid is ready — clear the spinner now so the user
          // isn't waiting on the Voyage round-trip.
          setIsLoading(false);

          // Semantic arrives after; it fills remaining slots.
          const semanticResult = await semanticPromise;
          if (reqId !== requestIdRef.current) return;
          setSemanticData(semanticResult.hits);
        } catch (err) {
          if (reqId !== requestIdRef.current) return;
          console.error("Search error:", err);
          setError("Failed to load search results. Please try again.");
          setData([]);
          setSemanticData([]);
          setTotalCount(0);
          setIsLoading(false);
        }
      },
      300,
    ),
    [page],
  );

  // Re-run the search whenever any relevant URL parameter changes.
  const urlSignature = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    if (shouldSearch) {
      const keywordFilters = buildFilters();
      const semanticFilters = buildSemanticFilters();
      debouncedSearch(query, keywordFilters, semanticFilters);
    } else {
      requestIdRef.current++;
      setData([]);
      setSemanticData([]);
      setTotalCount(0);
      setFiltersData({
        categories: [],
        brands: [],
        priceRange: { min: 0, max: 0 },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSignature, page, debouncedSearch]);

  // Flat map of currently-active filters. Used by ListFilter for the
  // active visual state.
  const activeFilters = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === "category" || key === "brand" || key.startsWith("attr_")) {
        map[key] = value;
      }
    }
    return map;
  }, [searchParams]);

  const handleFilterClick = useCallback(
    (key: string, value: string): void => {
      const params = new URLSearchParams(searchParams.toString());

      const normalised = key.startsWith("attr_")
        ? value.trim().toLowerCase()
        : value;

      if (params.get(key) === normalised) {
        params.delete(key);
      } else if (normalised) {
        params.set(key, normalised);
      } else {
        params.delete(key);
      }

      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }, [query, router]);

  // ----- Semantic hits not already in the keyword grid -----
  // Used for the merged grid and for facet derivation.
  const semanticOnly = useMemo(() => {
    const keywordIds = new Set(data.map((d: any) => d._id));
    return semanticData.filter((s: any) => !keywordIds.has(s._id));
  }, [data, semanticData]);

  // ----- Merged results: keyword first, semantic fills the tail -----
  //
  // Keyword hits are relevance-ranked by Atlas Search, semantic hits
  // by cosine similarity. The scores are not comparable, so we don't
  // try to interleave them — keyword results take priority in their
  // existing order, and semantic-only products fill whatever slots
  // remain up to PAGE_SIZE.
  //
  // When keyword returns a full page (20 hits), semantic contributes
  // nothing visible. When keyword is thin or empty, semantic carries
  // the grid.
  const mergedResults = useMemo(() => {
    const keyword = data;
    const remaining = Math.max(0, PAGE_SIZE - keyword.length);
    const semanticFill = semanticOnly
      .slice(0, remaining)
      .map((s: any) => ({ _id: s._id, ...s._source }));
    return [...keyword, ...semanticFill];
  }, [data, semanticOnly]);

  // ----- Build attribute filter options -----
  // Counts across everything currently displayed.
  const attributeFilters = useMemo(() => {
    if (attributeDefs.length === 0) return [];

    const counts: Record<string, Record<string, number>> = {};
    mergedResults.forEach((product: any) => {
      attributeDefs.forEach((def) => {
        const raw = product[def.code];
        if (raw === undefined || raw === null || raw === "") return;
        if (Array.isArray(raw) && raw.length === 0) return;
        const formatted = formatAttributeValue(raw);
        if (!formatted || looksLikeUrl(formatted)) return;
        if (!counts[def.code]) counts[def.code] = {};
        counts[def.code][formatted] = (counts[def.code][formatted] ?? 0) + 1;
      });
    });

    return attributeDefs
      .map((def) => {
        const resultValues = Object.keys(counts[def.code] || {});
        const allValues = Array.from(
          new Set([...def.options, ...resultValues]),
        ).filter((v) => v && !looksLikeUrl(v));

        if (allValues.length === 0) return null;

        return {
          key: def.code,
          name: def.name,
          values: allValues.map((value) => ({
            value,
            count: counts[def.code]?.[value] ?? 0,
          })),
        };
      })
      .filter(
        (
          item,
        ): item is {
          key: string;
          name: string;
          values: { value: string; count: number }[];
        } => item !== null,
      );
  }, [mergedResults, attributeDefs]);

  // ----- Sidebar facets = keyword aggregations ∪ semantic-only results -----
  const mergedFilters = useMemo(() => {
    const catMap = new Map<
      string,
      { _id: string; name: string; count: number }
    >();
    const brandMap = new Map<
      string,
      { _id: string; name: string; count: number }
    >();

    for (const c of filtersData.categories || []) {
      const id = normalizeId(c._id);
      if (!id) continue;
      catMap.set(id, {
        _id: id,
        name: c.name || "Unknown",
        count: c.count || 0,
      });
    }
    for (const b of filtersData.brands || []) {
      const id = normalizeId(b._id);
      if (!id) continue;
      brandMap.set(id, {
        _id: id,
        name: b.name || "Unknown",
        count: b.count || 0,
      });
    }

    let minPrice = filtersData.priceRange?.min ?? 0;
    let maxPrice = filtersData.priceRange?.max ?? 0;

    for (const hit of semanticOnly) {
      const src = hit._source ?? {};

      const catId = normalizeId(src.categoryId);
      if (catId) {
        const existing = catMap.get(catId);
        if (existing) {
          existing.count += 1;
        } else {
          catMap.set(catId, {
            _id: catId,
            name: src.categoryName || "Unknown",
            count: 1,
          });
        }
      }

      const brandId = normalizeId(src.brand);
      if (brandId) {
        const existing = brandMap.get(brandId);
        if (existing) {
          existing.count += 1;
        } else {
          brandMap.set(brandId, {
            _id: brandId,
            name: src.brandName || "Unknown",
            count: 1,
          });
        }
      }

      const p = Number(src.price) || 0;
      if (p > 0) {
        if (minPrice === 0 || p < minPrice) minPrice = p;
        if (p > maxPrice) maxPrice = p;
      }
    }

    return {
      categories: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
      brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
      priceRange: { min: minPrice, max: maxPrice },
    };
  }, [filtersData, semanticOnly]);

  // ----- Memoized grid -----
  const productList = useMemo(
    () =>
      mergedResults.map((item: any) => (
        <ProductCard key={item._id} id={item._id} item={item} />
      )),
    [mergedResults],
  );

  // Total displayed = keyword count + semantic fill actually shown.
  // Distinct from totalCount, which is the keyword-engine's full count
  // (paginated). We show the displayed count since it matches the grid.
  const displayCount = mergedResults.length;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-background p-2 lg:px-8 lg:py-4">
      <div className="contents lg:block lg:sticky lg:top-20 lg:self-start lg:shrink-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
        <ListFilter
          openClose={openClose}
          setOpenClose={setOpenClose}
          filters={{
            categories: mergedFilters.categories,
            brands: mergedFilters.brands,
            priceRange: mergedFilters.priceRange,
            attributes: attributeFilters,
          }}
          activeFilters={activeFilters}
          handleFilterClick={handleFilterClick}
        />
      </div>

      <div className="flex-1 p-2 lg:py-4 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-sm font-semibold text-foreground">
            {query ? (
              <>
                Search Results for:{" "}
                <span className="text-primary">{query}</span>
              </>
            ) : (
              "All Products"
            )}
          </h2>

          <div className="flex items-center gap-3">
            {hasNonQueryFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-destructive hover:text-destructive/80 text-sm font-medium transition-colors"
              >
                <Clear fontSize="small" />
                <span>Clear filters</span>
              </button>
            )}

            <button
              type="button"
              className="lg:hidden flex items-center gap-2 text-primary hover:text-primary/80 transition-colors bg-muted/50 px-3 py-2 rounded-lg"
              onClick={() => setOpenClose((prev) => !prev)}
            >
              <FilterList fontSize="medium" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center h-60 text-destructive">
            <p className="text-lg">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-60">
            <Spinner size={25} />
            <p className="mt-3 text-muted-foreground">Searching...</p>
          </div>
        ) : displayCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <p className="text-lg">
              {shouldSearch ? "No results found." : "No products available."}
            </p>
            {shouldSearch && (
              <p className="text-sm mt-1">
                Try adjusting your search or filters.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Found {displayCount} {displayCount === 1 ? "result" : "results"}
              {hasNonQueryFilters && " (filtered)"}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
              {productList}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchClient;
