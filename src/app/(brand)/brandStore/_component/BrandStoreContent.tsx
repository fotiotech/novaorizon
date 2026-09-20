"use client";

import { findProductsByBrand, getBrands } from "@/app/actions/brand";
import { Prices } from "@/components/cart/Prices";
import ImageRenderer from "@/components/ImageRenderer";
import { Brand } from "@/constant/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, memo } from "react";
import { Inventory2, SearchOff, Storefront } from "@mui/icons-material";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface StoreProduct {
  _id: string;
  name?: string;
  slug?: string;
  sku?: string;
  images?: string[];
  price?: number;
  listPrice?: number;
  quantity?: number;
  lowStockThreshold?: number;
  status?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const getStockState = (
  quantity: number | undefined,
  threshold: number | undefined,
): "in" | "low" | "out" => {
  const qty = quantity ?? 0;
  const low = threshold ?? 5;
  if (qty <= 0) return "out";
  if (qty <= low) return "low";
  return "in";
};

const getPriceInfo = (product: StoreProduct) => {
  const list = product.listPrice ?? 0;
  const price = product.price ?? 0;
  const hasDiscount = list > 0 && price > 0 && price < list;
  const displayPrice = hasDiscount ? price : list || price;
  return {
    displayPrice,
    originalPrice: hasDiscount ? list : undefined,
    hasDiscount,
    discountPct: hasDiscount ? Math.round(((list - price) / list) * 100) : 0,
  };
};

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */
const ProductSkeleton = memo(function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */
const ProductCard = memo(function ProductCard({
  product,
}: {
  product: StoreProduct;
}) {
  const href = `/products/details/${product._id}`;
  const name = product?.name || "Untitled product";
  const imageUrl = product?.images?.[0] || "";
  const { displayPrice, originalPrice, hasDiscount, discountPct } =
    getPriceInfo(product);
  const stock = getStockState(product.quantity, product.lowStockThreshold);

  const stockBadge =
    stock === "out" ? (
      <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
        Out of stock
      </span>
    ) : stock === "low" ? (
      <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
        Low stock
      </span>
    ) : null;

  return (
    <Link
      href={href}
      aria-label={`View ${name}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <ImageRenderer image={imageUrl} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
            <Inventory2 fontSize="large" />
            <span className="mt-1 text-[11px]">No image</span>
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            -{discountPct}%
          </span>
        )}

        {stockBadge && (
          <div className="absolute right-2 top-2">{stockBadge}</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition group-hover:text-primary"
          title={name}
        >
          {name}
        </p>

        {product.sku && (
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {product.sku}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-foreground">
            <Prices amount={displayPrice} />
          </span>
          {originalPrice !== undefined && (
            <span className="text-xs text-muted-foreground line-through">
              <Prices amount={originalPrice} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */
export default function BrandStoreContent() {
  const brandId = useSearchParams().get("brandId");

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState({
    brand: true,
    products: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!brandId) {
        if (isMounted) {
          setLoading({ brand: false, products: false });
          setError("No brand specified.");
        }
        return;
      }

      try {
        setError(null);
        setLoading({ brand: true, products: true });

        const [brandData, productsResult] = await Promise.all([
          getBrands(brandId),
          findProductsByBrand(brandId),
        ]);

        if (!isMounted) return;

        if (!productsResult.ok) {
          throw new Error(productsResult.error);
        }

        setBrand(brandData as Brand);
        setProducts((productsResult.products as StoreProduct[]) || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to fetch data:", err);
        setError(err?.message || "Failed to load brand store.");
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

  /* ---------------- Error ---------------- */
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const productCount = products.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Brand header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-14 w-14 aspect-square flex-none overflow-hidden rounded-full border border-border bg-background shadow-sm sm:h-16 sm:w-16">
            {loading.brand ? (
              <div className="h-full w-full animate-pulse bg-muted" />
            ) : brand?.logoUrl ? (
              <ImageRenderer image={brand.logoUrl} className="" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Storefront fontSize="small" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {loading.brand ? (
              <>
                <div className="mb-2 h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
              </>
            ) : (
              <>
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl">
                  {brand?.name || "Brand"}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {loading.products
                    ? "Loading products…"
                    : `${productCount} ${
                        productCount === 1 ? "product" : "products"
                      }`}
                </p>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Product grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading.products ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : productCount > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <SearchOff className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No products found
            </h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              This brand doesn&apos;t have any products yet. Check back later or
              browse the full catalog.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Browse all products
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
