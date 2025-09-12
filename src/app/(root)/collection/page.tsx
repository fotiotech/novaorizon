"use client";
import React, { useEffect, useState } from "react";
import { getCollectionById } from "@/app/actions/collection";
import { useSearchParams } from "next/navigation";
import ImageRenderer from "@/components/ImageRenderer";
import { Prices } from "@/components/cart/Prices";
import Spinner from "@/components/Spinner";
import Link from "next/link";

const CollectionPage = () => {
  const id = useSearchParams().get("id");
  const [collectionData, setCollectionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCollection() {
    if (!id) return;
    try {
      setLoading(true);
      const result = await getCollectionById(id);
      if (result.success) {
        setCollectionData(result.data);
      } else {
        setError(result.error || "Failed to fetch collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollection();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error}
      </div>
    );
  }

  if (!collectionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Collection not found
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Collection Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {collectionData.collection.name}
        </h1>
        {collectionData.collection.description && (
          <p className="text-gray-600 max-w-2xl mx-auto">
            {collectionData.collection.description}
          </p>
        )}
      </div>

      {/* Products Grid */}
      {collectionData.products && collectionData.products.length > 0 ? (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">
              {collectionData.productCount} products
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collectionData.products.map((product: any) => (
              <Link
                key={product._id}
                href={`/${product.url_slug || "product"}/details/${
                  product._id
                }`}
                className="group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full">
                  <div className="relative aspect-square bg-gray-100">
                    {product.main_image ? (
                      <ImageRenderer image={product.main_image} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {product.title || product.name}
                    </h3>
                    {product.shortDesc && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {product.shortDesc}
                      </p>
                    )}
                    {product.list_price !== undefined && (
                      <div className="mt-2">
                        <span className="font-bold text-gray-900">
                          <Prices amount={product.list_price} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No products found
          </h3>
          <p className="mt-1 text-gray-500">
            This collection doesn't have any products yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default CollectionPage;
