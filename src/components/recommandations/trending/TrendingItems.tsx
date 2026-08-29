"use client";

import { useState, useEffect } from "react";
import { getTrendingItems } from "@/app/actions/events";
import { ProductCard } from "../ProductCard";

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
}

interface TrendingItemsProps {
  /** Number of items to show, default 10 */
  limit?: number;
  /** Custom class for the grid container */
  className?: string;
  /** Custom message when no items are found */
  emptyMessage?: string;
}

export function TrendingItems({
  limit = 10,
  className = "grid grid-cols-2 md:grid-cols-5 gap-4",
  emptyMessage = "No trending products at the moment.",
}: TrendingItemsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrendingItems(limit);
      // The server action returns plain objects, but we need to cast
      setProducts(data as Product[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load trending items",
      );
      console.error("Trending fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [limit]);

  // Reload function for manual refresh
  const reload = () => fetchTrending();

  if (loading) {
    return <TrendingSkeleton count={limit} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <button
          onClick={reload}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center text-sm px-2 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="p-2">
      <h1 className="text-lg font-bold mb-2">Trending Now</h1>

      <div className={className}>
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────

export function TrendingSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg overflow-hidden animate-pulse"
        >
          <div className="h-48 w-full bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
