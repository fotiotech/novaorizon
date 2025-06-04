"use client";

import { findProductsByBrand, getBrands } from "@/app/actions/brand";
import { Prices } from "@/components/cart/Prices";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import { Brand } from "@/constant/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";

// We’ll define a minimal “Product” type here that matches your schema fields:
type BrandStoreProduct = {
  _id: string;
  identification_branding?: {
    name?: string;
  };
  media_visuals?: {
    main_image?: string;
    gallery?: string[];
  };
  pricing_availability?: {
    price?: number;
    currency?: string;
  };
};

const BrandStore = () => {
  const brandId = useSearchParams().get("brandId");

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<BrandStoreProduct[]>([]);

  useEffect(() => {
    async function fetchBrand() {
      if (!brandId) return;
      const data = await getBrands(brandId);
      setBrand(data);
    }
    async function fetchProductsByBrand() {
      if (!brandId) return;
      const res = await findProductsByBrand(brandId);
      // We expect `res` to be an array of products shaped like our mongoose model.
      setProducts(res as BrandStoreProduct[]);
    }
    fetchBrand();
    fetchProductsByBrand();
  }, [brandId]);

  return (
    <div className="min-h-screen">
      {/* ====== Header ====== */}
      <div className="flex gap-5 items-center p-3 border-b mb-3 bg-slate-50">
        <div className="w-20 h-20 rounded-full border bg-slate-100 overflow-hidden">
          {brand?.logoUrl && <ImageRenderer image={brand.logoUrl} />}
        </div>
        <h2 className="text-lg font-bold mb-4">
          {brand?.name || "Brand"} Store
        </h2>
      </div>

      {/* ====== Products Grid ====== */}
      <div className="grid grid-cols-2 p-2 lg:grid-cols-4 mx-auto gap-3 lg:gap-5">
        {products.length > 0 ? (
          products.map((product) => {
            // 1) Derive the detail-link URL using product._id
            const detailHref = `/products/details/${product._id}`;

            // 2) Derive name
            const name =
              product.identification_branding?.name || "Unnamed Product";

            // 3) Derive image: prefer main_image, otherwise use first gallery image
            const mainImg = product.media_visuals?.main_image;
            const gallery = product.media_visuals?.gallery || [];
            const imageUrl = mainImg || gallery[0] || "";

            // 4) Derive price (assuming currency handled inside <Prices>)
            const price = product.pricing_availability?.price ?? 0;

            return (
              <div
                key={product._id}
                className="mb-1 rounded bg-white shadow-sm"
              >
                <Link href={detailHref} aria-label={`View ${name}`}>
                  <div className="lg:h-60 p-2 bg-[#eee] h-52 rounded-lg overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <ImageRenderer image={imageUrl} />
                    ) : (
                      <div className="text-gray-400">No Image</div>
                    )}
                  </div>

                  <p className="mt-2 w-full line-clamp-2 px-2 text-sm font-medium">
                    {name}
                  </p>

                  <div className="px-2 py-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-lg">
                        <Prices amount={price} />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex justify-center py-20">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandStore;
