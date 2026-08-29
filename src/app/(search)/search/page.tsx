"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterList, Clear } from "@mui/icons-material";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { searchProducts } from "@/app/actions/search";
import { Prices } from "@/components/cart/Prices";
import ListFilter from "@/components/ListFilter";
import { debounce } from "./_component/debounce";

const Search = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("query") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const priceMin = searchParams.get("priceMin") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

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

        // Use aggregations from server
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
    if (category) filters.push({ term: { category_id: category } });
    if (brand) filters.push({ term: { brand: brand } });
    if (priceMin || priceMax) {
      const range: any = {};
      if (priceMin) range.gte = Number(priceMin);
      if (priceMax) range.lte = Number(priceMax);
      filters.push({ range: { list_price: range } });
    }
    return filters;
  }, [category, brand, priceMin, priceMax]);

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

  // Handle filter changes
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

  // Clear all filters
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    router.push(`/search?${params.toString()}`);
  }, [query, router]);

  // Pagination handler (optional)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/search?${params.toString()}`);
  };

  // Memoized product list
  const productList = useMemo(() => {
    return data.map((item: any) => {
      const imageUrl = item.main_image || null;
      const title = item.title;
      const price = item.list_price;
      const currency = item.currency || "CFA";

      return (
        <Link
          key={item._id}
          href={`/${title?.slice(0, 15) || "product"}/details/${item._id}`}
          className="group bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-primary/30"
        >
          {imageUrl ? (
            <div className="w-full aspect-[4/3] bg-muted/30">
              <ImageRenderer image={imageUrl} />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground text-sm">
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

  const hasActiveFilters = category || brand || priceMin || priceMax;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-background">
      <ListFilter
        openClose={openClose}
        setOpenClose={setOpenClose}
        filters={filtersData}
        handleFilterClick={handleFilterClick}
      />

      <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">
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
            <Spinner size={40} />
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

            {/* Pagination (add as needed) */}
            {/* You can compute total pages and show a pagination component */}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
