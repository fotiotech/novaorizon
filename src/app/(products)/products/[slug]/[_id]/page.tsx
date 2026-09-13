"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState, useRef, use } from "react";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./_compnents/ProductViewAnalytics";
import ReviewForm from "@/components/product/reviews/ProductReviews";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";
import { getCarriers } from "@/app/actions/carrier";
import { useUserData } from "@/app/context/UserDataContext";
import Image from "next/image";
import { getMenusByLocation } from "@/app/actions/menu";
import Carousel from "@/components/Carousel";
import { findProducts } from "@/app/actions/products";
import ProductAttributes from "./_compnents/ProductAttributes";

// ---------- Types ----------
interface Carrier {
  _id: string;
  name: string;
  regionsServed: Array<{
    region: string;
    basePrice: number;
    averageDeliveryTime: string;
  }>;
  costWeight: number;
}

interface Params {
  slug: string;
  _id: string;
}

// ---------- Helpers ----------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Keys on a variant that are NOT theme codes — these get their own handling
 * in `applyVariant` and must never be treated as theme dimensions.
 *
 *   `attributes` is the model's own key-value sub-array; without excluding
 *   it the variant-sync effect would treat it as a theme key and cause
 *   spurious merges on every render.
 */
const RESERVED_VARIANT_KEYS = new Set<string>([
  "_id",
  "sku",
  "price",
  "quantity",
  "images",
  "mainImage",
  "attributes",
  "createdAt",
  "updatedAt",
  "__v",
]);

/** camelCase a snake_case attribute code. */
const toCamel = (code: string): string =>
  code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Return the list of theme keys for a product/variant.
 *  1. Prefer the explicit `variantThemes` array on the product.
 *  2. Otherwise scan the variant's own keys, skipping reserved keys.
 */
function getThemeKeys(product: any, variant: any): string[] {
  const declared = Array.isArray(product?.variantThemes)
    ? product.variantThemes
    : [];
  if (declared.length > 0) {
    return declared.map((c: string) => toCamel(String(c))).filter(Boolean);
  }
  if (!variant || typeof variant !== "object") return [];
  return Object.keys(variant).filter((k) => !RESERVED_VARIANT_KEYS.has(k));
}

/**
 * Merge a selected variant into the product shown on the page.
 * Theme keys are copied to the root (so `product.color === "Green"` reflects
 * the current selection); price & images are overridden explicitly; other
 * reserved keys are left untouched.
 */
function applyVariant(product: any, variant: any) {
  if (!product || !variant) return product;
  const merged = JSON.parse(JSON.stringify(product));

  for (const key of Object.keys(variant)) {
    if (!RESERVED_VARIANT_KEYS.has(key)) {
      merged[key] = variant[key];
    }
  }

  if (typeof variant.price === "number") {
    merged.price = variant.price;
  }
  if (Array.isArray(variant.images) && variant.images.length > 0) {
    merged.images = variant.images;
  }

  return merged;
}

function renderAttributeValue(value: any): string {
  if (value === undefined || value === null) return "";
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "unit" in value
  ) {
    return `${value.value} ${value.unit}`;
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function doesCarrierServeAddress(carrier: Carrier, address: any): boolean {
  if (!address) return false;
  const addressStrings = [
    address.city,
    address.state,
    address.country,
    address.zipCode,
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase().trim());
  return carrier.regionsServed.some((regionObj) => {
    const region = regionObj.region.toLowerCase().trim();
    return addressStrings.some(
      (addrStr) => addrStr.includes(region) || region.includes(addrStr),
    );
  });
}

// ---------- Component: Carrier Shipping Options ----------
const CarrierShippingOptions: React.FC<{
  product: any;
  userAddresses: any[];
}> = ({ product, userAddresses }) => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carrierIds: string[] = product?.carrier || [];
  const hasCarriers = carrierIds.length > 0;

  useEffect(() => {
    if (!hasCarriers) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getCarriers()
      .then((data) => {
        setCarriers(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load carriers:", err);
        setError("Could not load shipping options.");
      })
      .finally(() => setLoading(false));
  }, [hasCarriers]);

  const primaryAddress =
    userAddresses && userAddresses.length > 0 ? userAddresses[0] : null;
  const availableCarriers = carriers.filter((carrier) =>
    doesCarrierServeAddress(carrier, primaryAddress),
  );

  if (!hasCarriers) return null;

  if (loading)
    return (
      <div className="mt-2 text-muted-foreground">
        Loading shipping options...
      </div>
    );
  if (error) return <div className="mt-2 text-destructive">{error}</div>;

  return (
    <div className="mt-4 ">
      <h3 className="text-lg font-semibold mb-1">Shipping Options</h3>
      {!primaryAddress ? (
        <p className="text-sm text-muted-foreground">
          Please{" "}
          <Link
            href="/account/addresses"
            className="text-primary hover:underline"
          >
            add an address
          </Link>{" "}
          to check shipping availability.
        </p>
      ) : availableCarriers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No carriers serve your region (
          {primaryAddress.city || primaryAddress.state || "your area"}).
        </p>
      ) : (
        <ul className="space-y-2">
          {availableCarriers.map((carrier) => {
            const regionDetail = carrier.regionsServed.find((r) =>
              doesCarrierServeAddress(carrier, primaryAddress),
            );
            return (
              <li
                key={carrier._id}
                className="flex justify-between items-center border-b border-border pb-1 last:border-0"
              >
                <div>
                  <span className="font-medium">{carrier.name}</span>
                  {regionDetail && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Est. delivery: {regionDetail.averageDeliveryTime})
                    </span>
                  )}
                </div>
                {regionDetail && (
                  <span className="font-semibold text-primary">
                    {regionDetail.basePrice} CFA
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// ---------- Variant Card Component ----------
const VariantCard: React.FC<{
  variant: any;
  themeKeys: string[];
  onSelect: (variant: any) => void;
  isActive: boolean;
}> = ({ variant, themeKeys, onSelect, isActive }) => {
  const variantImage = variant.images?.[0] || null;
  const price = variant.price || 0;

  return (
    <div
      onClick={() => onSelect(variant)}
      className={`min-w-[80px] max-w-[100px] flex-shrink-0 border rounded-lg p-1 bg-background hover:shadow-md transition-all cursor-pointer flex flex-col ${
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : " hover:border-primary/50"
      }`}
    >
      {/* Optional theme-value caption — enable if you want text labels on the
          cards in addition to the image swatch.
      {themeKeys.length > 0 && (
        <div className="text-[10px] text-muted-foreground truncate mb-0.5">
          {themeKeys.map((key) => (
            <span key={key} className="mr-1">
              {key}: {variant[key]}
            </span>
          ))}
        </div>
      )}
      */}

      {variantImage ? (
        <div className="relative aspect-square w-full h-20">
          <Image
            src={variantImage}
            alt=""
            fill
            className="object-contain"
            sizes="100px"
          />
        </div>
      ) : (
        <div className="w-full h-20 bg-muted flex items-center justify-center text-muted-foreground text-xs">
          No image
        </div>
      )}
      <div className="mt-0.5 w-full">
        <div className="font-semibold text-xs text-primary">
          {typeof price === "number" ? `${price} F` : "Price unavailable"}
        </div>
      </div>
    </div>
  );
};

// ---------- Related Menus Renderer ----------
const RelatedMenusRenderer: React.FC<{ menus: any[] }> = ({ menus }) => {
  if (!menus || menus.length === 0) return null;

  return (
    <div className="related-menus mt-4 space-y-4">
      {menus.map((menu) => {
        const {
          _id,
          name,
          sectionTitle,
          display,
          showImages = false,
          columns = 4,
          items = [],
        } = menu;

        if (!items || items.length === 0) return null;

        const getItemHref = (item: any) => {
          const slug = slugify(item.name);
          const prefix = item.contentType?.toLowerCase() + "s" || "products";
          return `/${prefix}/${slug}/${item._id}`;
        };

        const getGridCols = () => {
          const cols = Math.min(columns || 4, 6);
          const colMap: Record<number, string> = {
            1: "grid-cols-1",
            2: "grid-cols-2",
            3: "grid-cols-2 md:grid-cols-3",
            4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
            5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
            6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
          };
          return colMap[cols] || colMap[4];
        };

        const renderContent = () => {
          switch (display) {
            case "List":
              return (
                <ul className="space-y-1">
                  {items.map((item: any) => (
                    <li key={item._id} className="flex items-center gap-2">
                      {showImages && item.image && (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <ImageRenderer
                            image={item.image}
                            alt={item.name}
                            className="rounded"
                          />
                        </div>
                      )}
                      <Link
                        href={getItemHref(item)}
                        className="hover:underline line-clamp-1"
                        title={item.name}
                      >
                        {item.name}
                        {item.price && (
                          <p className="font-semibold text-sm">
                            {item.price} F
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            case "Grid":
              return (
                <div className={`grid gap-3 ${getGridCols()}`}>
                  {items.slice(0, 4).map((item: any) => (
                    <div key={item._id} className="p-1 rounded">
                      {showImages && item.image && (
                        <div className="relative w-full aspect-square mb-1 bg-gray-100">
                          <ImageRenderer
                            image={item.image}
                            alt={item.name}
                            className="rounded"
                          />
                        </div>
                      )}
                      <Link
                        href={getItemHref(item)}
                        className="block"
                        title={item.name}
                      >
                        <p className="line-clamp-2 text-sm">{item.name}</p>
                        {item.price && (
                          <p className="font-semibold text-sm">
                            {item.price} F
                          </p>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              );
            case "Carousel":
              return (
                <Carousel
                  items={items.slice(0, 4).map((item: any) => ({
                    _id: item._id,
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    contentType: item.contentType || "Product",
                  }))}
                  showImages={showImages}
                />
              );
            default:
              return (
                <div className="text-yellow-600">
                  Unknown display type: {display}
                </div>
              );
          }
        };

        return (
          <div key={_id} className="menu-node py-3 bg-white">
            {sectionTitle && (
              <h2 className="text-xl font-semibold mb-2">{sectionTitle}</h2>
            )}
            <div className="menu-content">{renderContent()}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Main Page ----------
export default function Details(props: { params: Promise<Params> }) {
  const params = use(props.params);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<
    number | null
  >(null);
  const initialLoadComplete = useRef(false);

  const { addresses: userAddresses } = useUserData();

  // Fetch product
  useEffect(() => {
    if (!params._id) {
      setError("No product ID provided");
      setLoading(false);
      return;
    }
    setLoading(true);
    findProducts(params._id)
      .then((result) => {
        if (result && (result as any).success === false) {
          setError((result as any).error || "Product not found");
          setProduct(null);
        } else if (result) {
          setProduct(result);
          setError(null);
        } else {
          setError("Product not found");
          setProduct(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch product:", err);
        setError(err.message || "Failed to load product");
      })
      .finally(() => setLoading(false));
  }, [params._id]);

  // Reset the "initial load done" flag when the product id changes.
  useEffect(() => {
    initialLoadComplete.current = false;
    setSelectedVariantIndex(null);
  }, [params._id]);

  // Fetch related menus
  const [menus, setMenus] = useState<any[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  useEffect(() => {
    if (!product?._id) return;
    setMenusLoading(true);
    getMenusByLocation("product_related", { productId: product._id })
      .then((res) => {
        if (res.success) {
          setMenus(res.data || []);
        } else {
          console.error("Failed to load related menus:", res.error);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setMenusLoading(false));
  }, [product?._id]);

  // -----------------------------------------------------------------
  // Variant sync on initial load
  // -----------------------------------------------------------------
  // We look for a variant whose theme keys match any theme keys that may
  // already be set at the product root (e.g. because the URL or a prior
  // selection pinned them). If none match, we fall back to the first
  // variant. Theme keys are derived via `getThemeKeys` — using the
  // product's declared `variantThemes` when available, and skipping
  // reserved keys (`attributes`, `mainImage`, …) otherwise.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (
      !product ||
      !Array.isArray(product.variants) ||
      product.variants.length === 0 ||
      initialLoadComplete.current
    ) {
      return;
    }

    const firstVariant = product.variants[0];
    const themeKeys = getThemeKeys(product, firstVariant);

    let foundIndex = -1;
    if (themeKeys.length > 0) {
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        let matches = true;
        for (const key of themeKeys) {
          const productValue = product[key];
          const variantValue = variant[key];
          if (productValue !== undefined && productValue !== variantValue) {
            matches = false;
            break;
          }
        }
        if (matches) {
          foundIndex = i;
          break;
        }
      }
    }

    if (foundIndex === -1) {
      foundIndex = 0;
    }

    const currentVariant = product.variants[foundIndex];

    // Detect whether the product root needs a merge with the selected
    // variant (theme keys or price/images differ).
    let needsUpdate = false;
    for (const key of themeKeys) {
      if (product[key] !== currentVariant[key]) {
        needsUpdate = true;
        break;
      }
    }
    if (
      !needsUpdate &&
      typeof currentVariant.price === "number" &&
      product.price !== currentVariant.price
    ) {
      needsUpdate = true;
    }
    if (
      !needsUpdate &&
      Array.isArray(currentVariant.images) &&
      currentVariant.images.length > 0 &&
      JSON.stringify(product.images) !== JSON.stringify(currentVariant.images)
    ) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      setProduct(applyVariant(product, currentVariant));
    }

    setSelectedVariantIndex(foundIndex);
    initialLoadComplete.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleVariantSelect = useCallback(
    (variant: any, index: number) => {
      if (product) {
        const merged = applyVariant(product, variant);
        setProduct(merged);
        setSelectedVariantIndex(index);
      }
    },
    [product],
  );

  if (loading) return <Spinner size={32} />;
  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <div className="text-destructive mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="w-full p-2 text-center">
        <div className="text-xl mb-4">Product not found</div>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  console.log("Rendering product details for:", product);

  const {
    _id = "",
    brand,
    name = "Untitled Product",
    sku = "",
    listPrice = 0,
    price = 0,
    quantity = 0,
    shortDescription = "",
    description = "",
    variants = [],
    images = [],
  } = product;

  const displayPrice = price || listPrice || 0;
  const inStock = quantity > 0;
  const stockStatus = inStock ? "In Stock" : "Out of Stock";

  return (
    <div className="w-full bg-background border-b-2 border-border py-1 md:py-3 px-2 md:px-8">
      <ProductViewAnalytics productId={params._id} />
      <div className="max-w-6xl mx-auto">
        {/* Product Basic Info */}
        <>
          <div className="flex flex-col md:flex-row gap-4">
            {Array.isArray(images) && images.length > 0 ? (
              <div className="md:w-1/2">
                {brand?.name && (
                  <Link href={`/brandStore?brandId=${_id}`} className="">
                    visit <span className="text-primary">{brand?.name}</span>
                  </Link>
                )}
                <DetailImages file={images} />
              </div>
            ) : (
              <div className="w-full md:w-1/2 flex items-center justify-center bg-muted text-muted-foreground rounded p-6">
                No images available
              </div>
            )}

            <div className="md:w-1/2 text-foreground">
              <h1 className="text-sm font-bold text-muted-foreground lg:text-lg mb-2">
                {name}
              </h1>

              {typeof displayPrice === "number" && (
                <div className="text-2xl font-semibold mb-2">
                  {displayPrice} F
                </div>
              )}

              <div
                className={`${
                  inStock
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                } mb-2`}
              >
                {stockStatus}
              </div>

              {/* Variant Cards */}
              {Array.isArray(variants) && variants.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-medium mb-1">
                    Available Variants
                  </h3>
                  <div className="flex overflow-x-auto gap-2 pb-1 md:grid md:grid-cols-2 lg:grid-cols-3 scrollbar-hide">
                    {variants.map((v: any, idx: number) => (
                      <VariantCard
                        key={idx}
                        variant={v}
                        themeKeys={getThemeKeys(product, v)}
                        onSelect={(variant) =>
                          handleVariantSelect(variant, idx)
                        }
                        isActive={selectedVariantIndex === idx}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full">
                <CheckoutButton
                  product={{
                    _id,
                    name,
                    price: displayPrice,
                  }}
                  width="w-full"
                >
                  Checkout
                </CheckoutButton>
                <AddToCart
                  product={{
                    _id,
                    name,
                    image: images[0] || "",
                    price: displayPrice,
                  }}
                />
              </div>

              <CarrierShippingOptions
                product={product}
                userAddresses={userAddresses}
              />
            </div>
          </div>

          {shortDescription && (
            <div className="my-3 rounded">
              <p className="text-muted-foreground text-sm">
                {shortDescription}
              </p>
            </div>
          )}
        </>

        {/* Key Features and Specifications */}
        <ProductAttributes product={product} />

        {/* Description */}
        <div className="mt-4 bg-background rounded">
          <h2 className="text-lg font-semibold mb-1">Description</h2>
          {description ? (
            <div
              className="prose max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-muted-foreground">No description available.</p>
          )}
        </div>

        {/* Related Menus */}
        {menusLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <RelatedMenusRenderer menus={menus} />
        )}

        {/* Reviews */}
        <div className="mt-4 bg-background rounded">
          {/* <ReviewForm productId={product._id} userId={""} /> */}
          <ExistingReviews reviews={product?.reviews} />
        </div>
      </div>
    </div>
  );
}
