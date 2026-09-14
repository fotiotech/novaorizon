"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterList, Clear } from "@mui/icons-material";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { searchProducts } from "@/app/actions/search";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { Prices } from "@/components/cart/Prices";
import ListFilter from "@/components/ListFilter";
import { debounce } from "./_component/debounce";

const ALLOWED_ATTRIBUTE_SETS = new Set<string>([
  "keyFeatures",
  "specifications",
]);

const EXCLUDED_ATTRIBUTE_TYPES = new Set<string>(["file"]);

// ---------- Types ----------
type AttributeDef = {
  code: string;
  name: string;
  options: string[];
};

// ---------- Helpers ----------
/** Format a flat attribute value to a display string. */
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

/** Reject values that are obviously URLs or binary blobs. */
const looksLikeUrl = (s: string): boolean =>
  /^https?:\/\//i.test(s) || s.startsWith("data:") || s.length > 200;

const Search = () => {
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

  // ----- Derive the active category for attribute lookup -----
  const derivedCategoryId = useMemo(() => {
    if (category) return category;
    const first = data[0];
    if (!first) return "";
    const raw = first.categoryId ?? first.category_id;
    if (!raw) return "";
    return typeof raw === "object" ? String(raw._id ?? raw) : String(raw);
  }, [category, data]);

  // ----- Fetch attribute definitions (keyFeatures + specifications only) -----
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
            // Skip file/image attributes — their values are URLs.
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

        // ⭐ Only walk sets whose code is keyFeatures or specifications.
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

  // Enhanced debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, filters: any[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchProducts(searchQuery, filters, page, 20);
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
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to load search results. Please try again.");
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [page],
  );

  // Build filters from URL params
  const buildFilters = useCallback(() => {
    const filters: any[] = [];

    if (category) filters.push({ term: { categoryId: category } });
    if (brand) filters.push({ term: { brand: brand } });
    if (priceMin || priceMax) {
      const range: any = {};
      if (priceMin) range.gte = Number(priceMin);
      if (priceMax) range.lte = Number(priceMax);
      filters.push({ range: { listPrice: range } });
    }

    // Attribute filters — URL key format: `attr_<attributeCode>`
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

  // Fetch results when search params change
  useEffect(() => {
    if (query || category || brand || priceMin || priceMax) {
      const filters = buildFilters();
      debouncedSearch(query, filters);
    } else {
      setData([]);
      setTotalCount(0);
      setFiltersData({
        categories: [],
        brands: [],
        priceRange: { min: 0, max: 0 },
      });
    }
  }, [
    query,
    category,
    brand,
    priceMin,
    priceMax,
    page,
    debouncedSearch,
    buildFilters,
  ]);

  const handleFilterClick = useCallback(
    (key: string, value: string): void => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    router.push(`/search?${params.toString()}`);
  }, [query, router]);

  const hasActiveFilters = useMemo(() => {
    if (category || brand || priceMin || priceMax) return true;
    const params = new URLSearchParams(searchParams.toString());
    for (const [key] of params.entries()) {
      if (key.startsWith("attr_")) return true;
    }
    return false;
  }, [category, brand, priceMin, priceMax, searchParams]);

  // ----- Build attribute filter options -----
  const attributeFilters = useMemo(() => {
    if (attributeDefs.length === 0) return [];

    // Count value occurrences across the current page of results.
    const counts: Record<string, Record<string, number>> = {};
    data.forEach((product) => {
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
  }, [data, attributeDefs]);

  // Memoized product list
  const productList = useMemo(() => {
    return data.map((item: any) => {
      const imageUrl = item.images?.[0] || null;
      const title = item.name || item.title;
      const price = item.price;
      const currency = "F";

      return (
        <Link
          key={item._id}
          href={`/products/${title?.slice(0, 15) || "product"}/${item._id}`}
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
            {price != null && (
              <p className="mt-1 text-primary font-semibold text-sm">
                <Prices amount={price} currency={currency} />
              </p>
            )}
          </div>
        </Link>
      );
    });
  }, [data]);

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-background p-2 lg:px-8 lg:py-4">
      <ListFilter
        openClose={openClose}
        setOpenClose={setOpenClose}
        filters={{
          categories: filtersData.categories,
          brands: filtersData.brands,
          priceRange: filtersData.priceRange,
          attributes: attributeFilters,
        }}
        handleFilterClick={handleFilterClick}
      />

      <div className="flex-1 p-2 lg:py-4 max-w-7xl mx-auto">
        {/* Header */}
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
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-destructive hover:text-destructive/80 text-sm font-medium transition-colors"
              >
                <Clear fontSize="small" />
                <span>Clear filters</span>
              </button>
            )}

            <button
              className="lg:hidden flex items-center gap-2 text-primary hover:text-primary/80 transition-colors bg-muted/50 px-3 py-2 rounded-lg"
              onClick={() => setOpenClose((prev) => !prev)}
            >
              <FilterList fontSize="medium" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Error / Loading / Empty states */}
        {error ? (
          <div className="flex flex-col items-center justify-center h-60 text-destructive">
            <p className="text-lg">{error}</p>
            <button
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
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <p className="text-lg">
              {query ? "No results found." : "No products available."}
            </p>
            {query && (
              <p className="text-sm mt-1">
                Try adjusting your search or filters.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Found {totalCount} {totalCount === 1 ? "result" : "results"}
              {hasActiveFilters && " (filtered)"}
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

export default Search;
