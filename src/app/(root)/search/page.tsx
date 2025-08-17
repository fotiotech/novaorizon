"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterList } from "@mui/icons-material";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { searchProducts } from "@/app/actions/search";
import { Prices } from "@/components/cart/Prices";
import ListFilter from "@/components/ListFilter";

const Search = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("query") || undefined;
  const category = searchParams.get("category") || undefined;
  const brand = searchParams.get("brand") || undefined;
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");

  const [data, setData] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [filtersData, setFiltersData] = useState<any>({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 0 },
  });

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);

      const filters: any[] = [];
      if (category) filters.push({ term: { category_id: category } });
      if (brand) filters.push({ term: { brand: brand } });
      if (priceMin || priceMax) {
        const range: any = {};
        if (priceMin) range.gte = Number(priceMin);
        if (priceMax) range.lte = Number(priceMax);
        filters.push({ range: { price: range } });
      }

      const result = await searchProducts(query as string, filters, 1, 20);

      // Map Elasticsearch hits to usable items and extract filter info
      const items = result.hits.map((hit: any) => {
        const source = hit._source;
        return {
          _id: hit._id,
          ...source,
        };
      });

      // Extract available categories and brands from hits for filters
      const categories = Array.from(
        new Set(items.map((item) => item.category).filter(Boolean))
      );
      const brands = Array.from(
        new Set(items.map((item) => item.brand).filter(Boolean))
      );

      // Update state
      setFiltersData({
        categories,
        brands,
        priceRange: {
          min: Math.min(...items.map((i) => i.price)),
          max: Math.max(...items.map((i) => i.price)),
        },
      });
      setData(items);
      setIsLoading(false);
    }

    fetchResults();
  }, [query, category, brand, priceMin, priceMax]);

  function handleFilterClick(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

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
            Search Results for: <span className="text-blue-600">{query}</span>
          </h2>
          <button
            className="lg:hidden flex items-center space-x-2 text-blue-500"
            onClick={() => setOpenClose((prev) => !prev)}
          >
            <FilterList fontSize="medium" />
            <span>Filters</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <Spinner />
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-60 text-lg text-gray-500">
            No results found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.map((item: any) => {
              const imageUrl = item.main_image || null;
              const title = item.name;
              const price = item.price;
              const currency = item.currency || "CFA";

              return (
                <Link
                  key={item._id}
                  href={`/slug/details/${item._id}`}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
