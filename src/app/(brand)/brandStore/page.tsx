"use client";

import { findProductsByBrand, getBrands } from "@/app/actions/brand";
import { Prices } from "@/components/cart/Prices";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { Brand } from "@/constant/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";

const BrandStore = () => {
  const brandId = useSearchParams().get("brandId");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    brand: true,
    products: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!brandId) return;
      
      try {
        setError(null);
        
        // Fetch brand and products in parallel
        const [brandData, productsData] = await Promise.all([
          getBrands(brandId),
          findProductsByBrand(brandId)
        ]);

        if (!isMounted) return;

        setBrand(brandData);
        setProducts(productsData as any[]);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch data:", err);
        setError("Failed to load brand store. Please try again.");
      } finally {
        if (isMounted) {
          setLoading({ brand: false, products: false });
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [brandId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
              {loading.brand ? (
                <div className="w-full h-full bg-gray-200 animate-pulse"></div>
              ) : brand?.logoUrl ? (
                <ImageRenderer 
                  image={brand.logoUrl} 
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No Logo</span>
                </div>
              )}
            </div>
            
            <div>
              {loading.brand ? (
                <>
                  <div className="h-6 w-40 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                </>
              ) : (
                <>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                    {brand?.name || "Brand"} Store
                  </h1>
                  <p className="text-gray-500 text-sm">
                    {products.length} {products.length === 1 ? 'product' : 'products'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-6">
        {loading.products ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => {
              const detailHref = `/products/details/${product._id}`;
              const name = product?.title || "Unnamed Product";
              const mainImg = product?.main_image;
              const gallery = product?.gallery || [];
              const imageUrl = mainImg || gallery[0] || "";
              const price = product?.list_price ?? 0;

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <Link href={detailHref} aria-label={`View ${name}`}>
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                      {imageUrl ? (
                        <ImageRenderer 
                          image={imageUrl} 
                        />
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs mt-1">No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2" title={name}>
                        {name}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          <Prices amount={price} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-16M5 17a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">This brand doesn't have any products yet.</p>
            <Link 
              href="/products" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandStore;