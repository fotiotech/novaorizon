"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterList } from "@mui/icons-material";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { searchProducts } from "@/app/actions/search";
import { Prices } from "@/components/cart/Prices";

/**
 * Uses direct fields returned by searchProducts items:
 * - _id
 * - name
 * - main_image
 * - gallery[]
 * - price
 * - currency
 */
const Search = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("query") || undefined;
  const category = searchParams.get("category") || undefined;
  const brand = searchParams.get("brand") || undefined;
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openClose, setOpenClose] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      const opts = {
        textQuery: query,
        limit: 20,
        skip: 0,
        sortBy: { createdAt: -1 },
      } as any;
      if (category) opts.category_id = category;
      if (brand) opts.brand_id = brand;
      if (priceMin) opts.priceMin = Number(priceMin);
      if (priceMax) opts.priceMax = Number(priceMax);

      const result = await searchProducts(opts);
      setData(result as any);
      setIsLoading(false);
    }
    fetchResults();
  }, [query, category, brand, priceMin, priceMax]);

  const items = data?.items || [];

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      {/* uncomment when ready to use sidebar
      <ListFilter
        openClose={openClose}
        setOpenClose={setOpenClose}
        filters={filters || { categories: [], brands: [], priceRange: {} }}
        handleFilterClick={handleFilterClick}
      />
      */}
      <div className="flex-1 px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
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

        {isLoading && (
          <div className="flex justify-center items-center h-60">
            <Spinner />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex justify-center items-center h-60 text-lg text-gray-500">
            No results found.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item: any) => {
            const imageUrl = item.main_image || item.gallery?.[0] || null;
            const title = item.name;
            const price = item.price;
            const currency = item.currency || "USD";

            return (
              <Link
                key={item._id}
                href={`/slug/details/${item._id}`}
                className="bg-white shadow rounded-md overflow-hidden hover:shadow-lg transition"
              >
                {imageUrl && <ImageRenderer image={imageUrl} />}
                <div className="p-2">
                  <p className="text-sm font-medium line-clamp-2">{title}</p>
                  {price != null && (
                    <p className="mt-1 text-blue-600 font-bold text-sm">
                      <Prices amount={price} />
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Search;
