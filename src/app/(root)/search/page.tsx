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

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersData, setFiltersData] = useState<any>({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 0 },
  });

  // Enhanced debounced search function with debugging
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, filters: any[]) => {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Searching with:', { 
        searchQuery, 
        filters,
        urlParams: { query, category, brand, priceMin, priceMax }
      });

      try {
        const result = await searchProducts(searchQuery, filters, 1, 20);

        console.log('📦 Search result:', result);

        // Transform the MongoDB results to match the expected format
        const items = result.hits.map((hit: any) => ({
          _id: hit._id,
          ...hit._source,
        }));

        console.log('🔄 Transformed items:', items);

        // Extract available categories and brands for filters
        const categories = Array.from(
          new Set(
            items
              .map((item: any) => item.category)
              .filter(Boolean)
              .map((cat: any) => ({
                _id: cat._id,
                name: cat.name,
                count: items.filter((item: any) => 
                  item.category?._id === cat._id
                ).length
              }))
          )
        );

        const brands = Array.from(
          new Set(
            items
              .map((item: any) => item.brand)
              .filter(Boolean)
              .map((brand: any) => ({
                _id: brand._id,
                name: brand.name,
                count: items.filter((item: any) => 
                  item.brand?._id === brand._id
                ).length
              }))
          )
        );

        // Calculate price range from actual products
        const prices = items.map((item: any) => item.price).filter(price => price != null);
        const priceRange = {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        };

        console.log('🎯 Filters data:', { categories, brands, priceRange });

        // Update state
        setFiltersData({
          categories,
          brands,
          priceRange,
        });
        setData(items);
      } catch (err) {
        console.error("❌ Search error:", err);
        setError("Failed to load search results. Please try again.");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [query, category, brand, priceMin, priceMax] // Added dependencies
  );

  // Build filters from URL params
  const buildFilters = useCallback(() => {
    const filters: any[] = [];

    if (category) {
      filters.push({ term: { category_id: category } });
      console.log('✅ Added category filter:', category);
    }
    if (brand) {
      filters.push({ term: { brand: brand } });
      console.log('✅ Added brand filter:', brand);
    }
    if (priceMin || priceMax) {
      const range: any = {};
      if (priceMin) range.gte = Number(priceMin);
      if (priceMax) range.lte = Number(priceMax);
      filters.push({ range: { price: range } });
      console.log('✅ Added price range filter:', range);
    }

    console.log('🧩 Built filters:', filters);
    return filters;
  }, [category, brand, priceMin, priceMax]);

  // Fetch results when search params change
  useEffect(() => {
    console.log('🔄 Search params changed:', {
      query, category, brand, priceMin, priceMax
    });

    if (query || category || brand || priceMin || priceMax) {
      const filters = buildFilters();
      debouncedSearch(query, filters);
    } else {
      console.log('🔄 No search criteria, clearing results');
      setData([]);
      setIsLoading(false);
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
    debouncedSearch,
    buildFilters,
  ]);

  // Handle filter changes
  const handleFilterClick = useCallback(
    (key: string, value: string): void => {
      console.log('🎛️ Filter clicked:', { key, value });
      
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to first page when filters change
      params.delete("page");

      console.log('🔄 Navigating to new URL with params:', params.toString());
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    console.log('🗑️ Clearing all filters');
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    router.push(`/search?${params.toString()}`);
  }, [query, router]);

  // Memoized product list to avoid unnecessary re-renders
  const productList = useMemo(() => {
    console.log('🔄 Rendering product list with', data.length, 'items');
    
    return data.map((item: any) => {
      const imageUrl = item.main_image || null;
      const title = item.title;
      const price = item.list_price;
      const currency = item.currency || "CFA";

      return (
        <Link
          key={item._id}
          href={`/${title.slice(0, 15)}/details/${item._id}`}
          className="bg-white shadow rounded-2xl overflow-hidden hover:shadow-lg transition duration-200"
        >
          {imageUrl && (
            <div className="w-full aspect-[4/3] bg-gray-100">
              <ImageRenderer image={imageUrl} />
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-medium line-clamp-2 text-gray-800">
              {title}
            </p>
            {price != null && (
              <p className="mt-1 text-blue-600 font-semibold text-sm">
                <Prices amount={price} currency={currency} />
              </p>
            )}
          </div>
        </Link>
      );
    });
  }, [data]);

  // Check if any filters are active
  const hasActiveFilters = category || brand || priceMin || priceMax;

  console.log('🎯 Current state:', {
    isLoading,
    dataCount: data.length,
    hasActiveFilters,
    filtersData
  });

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gray-50">
      <ListFilter
        openClose={openClose}
        setOpenClose={setOpenClose}
        filters={filtersData}
        handleFilterClick={handleFilterClick}
      />

      <div className="flex-1 px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {query ? (
              <>
                Search Results for:{" "}
                <span className="text-blue-600">{query}</span>
              </>
            ) : (
              "All Products"
            )}
          </h2>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-red-500 text-sm hover:text-red-700 transition-colors"
              >
                <Clear fontSize="small" />
                <span>Clear filters</span>
              </button>
            )}

            <button
              className="lg:hidden flex items-center space-x-2 text-blue-500 hover:text-blue-700 transition-colors"
              onClick={() => setOpenClose((prev) => !prev)}
            >
              <FilterList fontSize="medium" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex justify-center items-center h-60 text-lg text-red-500">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-60">
            <Spinner />
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-60 text-lg text-gray-500">
            {query ? "No results found." : "No products available."}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Found {data.length} {data.length === 1 ? "result" : "results"}
              {hasActiveFilters && " (filtered)"}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {productList}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Search;