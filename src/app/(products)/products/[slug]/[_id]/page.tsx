"use client";

import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
  use,
} from "react";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./_compnents/ProductViewAnalytics";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";
import { getCarriers } from "@/app/actions/carrier";
import { useUserData } from "@/app/context/UserDataContext";
import { getMenusByLocation } from "@/app/actions/menu";
import Carousel from "@/components/Carousel";
import Image from "next/image";
import { findProducts } from "@/app/actions/products";
import ProductAttributes from "./_compnents/ProductAttributes";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";

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

// ---------- Typography tokens ----------
// Single source of truth for the page's type scale. Any component that
// renders text should use these tokens so headings align across sections.
const TYPO = {
  /** Product name — the page's H1. */
  pageTitle: "text-base font-semibold text-foreground/90 leading-snug",
  /** Section heading (Description, Shipping, Related menus, …). */
  sectionTitle: "text-lg font-bold text-foreground leading-snug",
  /** Sub-label inside a section (variant theme label, spec group name, …). */
  label: "text-sm font-semibold text-foreground",
  /** Price — the most prominent number on the page. */
  price: "text-2xl font-semibold text-foreground leading-tight",
  /** Default body copy. */
  body: "text-sm text-foreground",
  /** Muted / secondary copy. */
  muted: "text-sm text-muted-foreground",
  /** Tiny helper text. */
  tiny: "text-xs text-muted-foreground",
} as const;

// ---------- Helpers ----------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

/**
 * Return the first positive, finite numeric candidate.
 * This makes `listPrice` reachable when `price` is 0.
 */
function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

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

const toCamel = (code: string): string =>
  code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

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
      <div className={`mt-2 ${TYPO.muted}`}>Loading shipping options...</div>
    );
  if (error)
    return <div className="mt-2 text-sm text-destructive">{error}</div>;

  return (
    <div className="mt-5">
      <h3 className={`${TYPO.sectionTitle} mb-2`}>Shipping Options</h3>
      {!primaryAddress ? (
        <p className={TYPO.muted}>
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
        <p className={TYPO.muted}>
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
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {carrier.name}
                  </span>
                  {regionDetail && (
                    <span className={`ml-2 ${TYPO.muted}`}>
                      (Est. delivery: {regionDetail.averageDeliveryTime})
                    </span>
                  )}
                </div>
                {regionDetail && (
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(regionDetail.basePrice)}
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
                        <span className={TYPO.body}>{item.name}</span>
                        {item.price > 0 && (
                          <p className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price)}
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
                        <p className={`line-clamp-2 ${TYPO.body}`}>
                          {item.name}
                        </p>
                        {item.price > 0 && (
                          <p className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price)}
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
                <div className="text-sm text-yellow-600">
                  Unknown display type: {display}
                </div>
              );
          }
        };

        return (
          <div key={_id} className="menu-node py-3 bg-white">
            {sectionTitle && (
              <h2 className={`${TYPO.sectionTitle} mb-2`}>{sectionTitle}</h2>
            )}
            <div className="menu-content">{renderContent()}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Per-theme Variant Card ----------
interface ThemeCardProps {
  value: string;
  image?: string | null;
  price?: number | null;
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  value,
  image,
  price,
  isActive,
  isAvailable,
  onClick,
}) => {
  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={value}
      title={value}
      className={`flex-shrink-0 w-[92px] flex flex-col items-center gap-1 rounded-lg border p-1 transition-all ${
        isActive
          ? "border-primary border-2 bg-primary/5"
          : isAvailable
            ? "border-border  hover:border-primary/60 bg-background"
            : "border-border bg-background opacity-40 cursor-not-allowed"
      }`}
    >
      <div className="relative w-full h-[68px] bg-muted/40 rounded overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={value}
            fill
            className={`object-contain ${isAvailable ? "" : "grayscale"}`}
            sizes="92px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <span
        className={`text-xs font-semibold truncate w-full text-left ${
          isActive
            ? "text-primary"
            : isAvailable
              ? "text-foreground"
              : "text-muted-foreground"
        }`}
      >
        {price != null && price > 0 ? formatPrice(price) : "—"}
      </span>
    </button>
  );
};

// ---------- Variant Selector ----------
interface VariantSelectorProps {
  product: any;
  themeKeys: string[];
  themeValues: Record<string, string[]>;
  selectedValues: Record<string, string>;
  onSelectValue: (themeKey: string, value: string) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  themeKeys,
  themeValues,
  selectedValues,
  onSelectValue,
}) => {
  if (themeKeys.length === 0) return null;

  const isAvailable = (themeKey: string, value: string): boolean => {
    if (!product?.variants) return false;
    for (const v of product.variants) {
      if (String(v[themeKey]) !== value) continue;
      let ok = true;
      for (const k of themeKeys) {
        if (k === themeKey) continue;
        if (selectedValues[k] && String(v[k]) !== selectedValues[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  };

  const representativeFor = (themeKey: string, value: string): any | null => {
    if (!product?.variants) return null;
    let firstMatch: any = null;
    for (const v of product.variants) {
      if (String(v[themeKey]) !== value) continue;
      if (!firstMatch) firstMatch = v;
      let ok = true;
      for (const k of themeKeys) {
        if (k === themeKey) continue;
        if (selectedValues[k] && String(v[k]) !== selectedValues[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return v;
    }
    return firstMatch;
  };

  const imageFor = (themeKey: string, value: string): string | null => {
    const v = representativeFor(themeKey, value);
    if (!v) return null;
    if (Array.isArray(v.images) && v.images.length > 0) return v.images[0];
    return null;
  };

  const priceFor = (themeKey: string, value: string): number | null => {
    const v = representativeFor(themeKey, value);
    if (!v) return null;
    if (typeof v.price === "number") return v.price;
    return null;
  };

  return (
    <div className="mt-4 space-y-5">
      {themeKeys.map((themeKey) => {
        const values = themeValues[themeKey] || [];
        if (values.length === 0) return null;

        const activeValue = selectedValues[themeKey] || "";
        const label = themeKey.charAt(0).toUpperCase() + themeKey.slice(1);

        return (
          <div key={themeKey}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={TYPO.label}>{label}</span>
              {activeValue && <span className={TYPO.muted}>{activeValue}</span>}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {values.map((value) => {
                const isSelected = activeValue === value;
                const available = isAvailable(themeKey, value);
                const img = imageFor(themeKey, value);
                const price = priceFor(themeKey, value);

                return (
                  <ThemeCard
                    key={value}
                    value={value}
                    image={img}
                    price={price}
                    isActive={isSelected}
                    isAvailable={available}
                    onClick={() => onSelectValue(themeKey, value)}
                  />
                );
              })}
            </div>
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

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {},
  );
  const [isSpecsSheetOpen, setIsSpecsSheetOpen] = useState(false);
  const initialLoadComplete = useRef(false);

  const isMobile = useIsMobile();

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

  useEffect(() => {
    initialLoadComplete.current = false;
    setSelectedValues({});
    setIsSpecsSheetOpen(false);
  }, [params._id]);

  // Fetch related menus
  const [menus, setMenus] = useState<any[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  useEffect(() => {
    if (!product?._id) return;
    setMenusLoading(true);
    getMenusByLocation("product_related", { productId: product._id })
      .then((res) => {
        if (res.success) setMenus(res.data || []);
        else console.error("Failed to load related menus:", res.error);
      })
      .catch((err) => console.error(err))
      .finally(() => setMenusLoading(false));
  }, [product?._id]);

  const themeKeys = useMemo<string[]>(() => {
    if (!product?.variants?.length) return [];
    return getThemeKeys(product, product.variants[0]);
  }, [product]);

  const themeValues = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    if (!product?.variants) return map;
    for (const key of themeKeys) {
      const seen = new Set<string>();
      for (const v of product.variants) {
        const val = v[key];
        if (val !== undefined && val !== null && val !== "") {
          seen.add(String(val));
        }
      }
      map[key] = Array.from(seen);
    }
    return map;
  }, [product, themeKeys]);

  useEffect(() => {
    if (
      !product ||
      !Array.isArray(product.variants) ||
      product.variants.length === 0 ||
      themeKeys.length === 0 ||
      initialLoadComplete.current
    ) {
      return;
    }
    const first = product.variants[0];
    const init: Record<string, string> = {};
    for (const key of themeKeys) {
      if (first[key] !== undefined && first[key] !== null) {
        init[key] = String(first[key]);
      }
    }
    setSelectedValues(init);
    initialLoadComplete.current = true;
  }, [product, themeKeys]);

  const matchedVariant = useMemo<any | null>(() => {
    if (!product?.variants?.length) return null;
    for (const v of product.variants) {
      let ok = true;
      for (const k of themeKeys) {
        if (selectedValues[k] && String(v[k]) !== selectedValues[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return v;
    }
    return null;
  }, [product, themeKeys, selectedValues]);

  const handleSelectValue = useCallback(
    (themeKey: string, value: string) => {
      if (!product?.variants?.length) return;

      const candidate: Record<string, string> = {
        ...selectedValues,
        [themeKey]: value,
      };

      const exact = product.variants.find((v: any) => {
        for (const k of themeKeys) {
          if (candidate[k] && String(v[k]) !== candidate[k]) return false;
        }
        return true;
      });

      if (exact) {
        setSelectedValues(candidate);
        return;
      }

      const fallback = product.variants.find(
        (v: any) => String(v[themeKey]) === value,
      );
      if (fallback) {
        const next: Record<string, string> = {};
        for (const k of themeKeys) {
          if (fallback[k] !== undefined && fallback[k] !== null) {
            next[k] = String(fallback[k]);
          }
        }
        setSelectedValues(next);
      }
    },
    [product, themeKeys, selectedValues],
  );

  if (loading) return <Spinner size={32} />;
  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <div className="text-sm text-destructive mb-4">{error}</div>
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
        <div className="text-lg font-semibold mb-4">Product not found</div>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const {
    _id = "",
    brand,
    name = "Untitled Product",
    listPrice = 0,
    price: basePrice = 0,
    quantity: baseQuantity = 0,
    shortDescription = "",
    description = "",
    variants = [],
    images: baseImages = [],
  } = product;

  // Variant price wins when positive, then base price, then listPrice.
  // `pickPrice` ignores zeros so a `price: 0` doesn't shadow a real value.
  const displayPrice = pickPrice(matchedVariant?.price, basePrice, listPrice);

  // Only show the struck-through list price when it is a genuine discount.
  const numericListPrice = Number(listPrice) || 0;
  const showListPrice = numericListPrice > displayPrice && displayPrice > 0;

  const displayQuantity = matchedVariant?.quantity ?? baseQuantity;
  const displayImages =
    Array.isArray(matchedVariant?.images) && matchedVariant.images.length > 0
      ? matchedVariant.images
      : baseImages;

  const inStock = displayQuantity > 0;
  const stockStatus = inStock ? "In Stock" : "Out of Stock";

  // Reusable description markup
  const descriptionBlock = (
    <div className="mt-5">
      <h2 className={`${TYPO.sectionTitle} mb-2`}>Description</h2>
      {description ? (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : (
        <p className={TYPO.muted}>No description available.</p>
      )}
    </div>
  );

  return (
    <div className="w-full bg-background border-b-2 border-border py-1 md:py-3 px-2 md:px-8">
      <ProductViewAnalytics productId={params._id} />
      <div className="max-w-6xl mx-auto">
        <>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left column: images + (desktop) description */}
            <div className="md:w-1/2">
              {Array.isArray(displayImages) && displayImages.length > 0 ? (
                <>
                  {brand?.name && (
                    <Link
                      href={`/brandStore?brandId=${_id}`}
                      className={TYPO.muted}
                    >
                      visit <span className="text-primary">{brand?.name}</span>
                    </Link>
                  )}
                  <DetailImages file={displayImages} />
                </>
              ) : (
                <div className="w-full flex items-center justify-center bg-muted text-muted-foreground rounded p-6 text-sm">
                  No images available
                </div>
              )}

              {/* Desktop-only: description under the images */}
              <div className="hidden md:block">{descriptionBlock}</div>
            </div>

            {/* Right column: product info */}
            <div className="md:w-1/2 text-foreground">
              <h1 className={`${TYPO.pageTitle} mb-2`}>{name}</h1>

              <div className="flex items-baseline gap-3 mb-2">
                <p className={TYPO.price}>
                  {displayPrice > 0
                    ? formatPrice(displayPrice)
                    : "Price on request"}
                </p>
                {showListPrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(numericListPrice)}
                  </p>
                )}
              </div>

              <div
                className={`text-sm font-medium mb-3 ${
                  inStock
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                }`}
              >
                {stockStatus}
              </div>

              {Array.isArray(variants) && variants.length > 0 && (
                <VariantSelector
                  product={product}
                  themeKeys={themeKeys}
                  themeValues={themeValues}
                  selectedValues={selectedValues}
                  onSelectValue={handleSelectValue}
                />
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
                    image: displayImages[0] || "",
                    price: displayPrice,
                  }}
                />
              </div>

              <CarrierShippingOptions
                product={product}
                userAddresses={userAddresses}
              />

              {/* Mobile-only: Key Features stay inline */}
              {isMobile && (
                <ProductAttributes product={product} variant="keyFeatures" />
              )}

              {shortDescription && (
                <div className="my-4">
                  <p className={TYPO.muted}>{shortDescription}</p>
                </div>
              )}

              {/* Mobile-only: Specifications trigger — opens bottom sheet */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setIsSpecsSheetOpen(true)}
                  className="mt-3 w-full flex items-center justify-between text-foreground transition-colors"
                >
                  <span className={TYPO.sectionTitle}>Specifications</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}

              {/* Desktop: both sections inline */}
              {!isMobile && (
                <ProductAttributes product={product} variant="both" />
              )}

              {/* Mobile: specifications inside the bottom sheet */}
              {isMobile && (
                <BottomSheet
                  open={isSpecsSheetOpen}
                  onClose={() => setIsSpecsSheetOpen(false)}
                  title="Specifications"
                >
                  <ProductAttributes
                    product={product}
                    variant="specifications"
                  />
                </BottomSheet>
              )}
            </div>
          </div>
        </>

        {/* Mobile-only: description stays below the columns */}
        <div className="md:hidden">{descriptionBlock}</div>

        {menusLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <RelatedMenusRenderer menus={menus} />
        )}

        <div className="mt-4 bg-background rounded">
          <ExistingReviews reviews={product?.reviews} />
        </div>
      </div>
    </div>
  );
}
