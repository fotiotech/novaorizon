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
import ExistingReviews from "@/app/(products)/products/[slug]/[_id]/_compnents/reviews/ExistingReviews";
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
const TYPO = {
  pageTitle: "text-base font-semibold text-foreground/90 leading-snug",
  sectionTitle: "text-lg font-semibold text-foreground leading-snug",
  label: "text-sm font-semibold text-foreground",
  price: "text-2xl font-semibold text-foreground leading-tight",
  body: "text-sm text-foreground",
  muted: "text-sm text-muted-foreground",
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

function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function toImageUrl(entry: any): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    const candidate =
      entry.url ?? entry.src ?? entry.publicUrl ?? entry.path ?? entry.image;
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = candidate.url ?? candidate.src ?? candidate.publicUrl;
      if (typeof nested === "string") return nested;
    }
  }
  return null;
}

function normalizeImages(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of arr) {
    const url = toImageUrl(entry);
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
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

// ---------- Carrier Shipping Options ----------
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
      <div className={`mt-4 ${TYPO.muted}`}>Loading shipping options…</div>
    );
  if (error)
    return <div className="mt-4 text-sm text-destructive">{error}</div>;

  return (
    <div className="mt-6">
      <h3 className={`${TYPO.sectionTitle} mb-2`}>Shipping</h3>
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
        <ul className="divide-y divide-border rounded-lg border border-border">
          {availableCarriers.map((carrier) => {
            const regionDetail = carrier.regionsServed.find((r) =>
              doesCarrierServeAddress(carrier, primaryAddress),
            );
            return (
              <li
                key={carrier._id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {carrier.name}
                  </p>
                  {regionDetail && (
                    <p className={TYPO.tiny}>
                      Estimated delivery: {regionDetail.averageDeliveryTime}
                    </p>
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
    <div className="mt-8 space-y-8">
      {menus.map((menu) => {
        const {
          _id,
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
                        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
                          <ImageRenderer
                            image={item.image}
                            alt={item.name}
                            className="rounded"
                          />
                        </div>
                      )}
                      <Link
                        href={getItemHref(item)}
                        className="flex items-baseline justify-between gap-3 hover:underline"
                        title={item.name}
                      >
                        <span className={`line-clamp-1 ${TYPO.body}`}>
                          {item.name}
                        </span>
                        {item.price > 0 && (
                          <span className="shrink-0 text-sm font-medium text-foreground">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            case "Grid":
              return (
                <div className={`grid gap-4 ${getGridCols()}`}>
                  {items.slice(0, 4).map((item: any) => (
                    <Link
                      key={item._id}
                      href={getItemHref(item)}
                      className="group block"
                      title={item.name}
                    >
                      {showImages && item.image && (
                        <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/40">
                          <ImageRenderer
                            image={item.image}
                            alt={item.name}
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <p className={`line-clamp-2 ${TYPO.body}`}>{item.name}</p>
                      {item.price > 0 && (
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {formatPrice(item.price)}
                        </p>
                      )}
                    </Link>
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
          <section key={_id}>
            {sectionTitle && (
              <h2 className={`${TYPO.sectionTitle} mb-4`}>{sectionTitle}</h2>
            )}
            {renderContent()}
          </section>
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
      className={`flex w-[92px] flex-shrink-0 flex-col items-center gap-1 rounded-lg border p-1 transition-all ${
        isActive
          ? "border-2 border-primary bg-primary/5"
          : isAvailable
            ? "border-border bg-background hover:border-primary/60"
            : "border-border bg-background opacity-40 cursor-not-allowed"
      }`}
    >
      <div className="relative h-[68px] w-full overflow-hidden rounded bg-muted/40">
        {image ? (
          <Image
            src={image}
            alt={value}
            fill
            className={`object-contain ${isAvailable ? "" : "grayscale"}`}
            sizes="92px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <span
        className={`w-full truncate text-left text-xs font-semibold ${
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
    const normalized = normalizeImages(v.images);
    return normalized[0] ?? null;
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
            <div className="mb-2 flex items-baseline gap-2">
              <span className={TYPO.label}>{label}</span>
              {activeValue && <span className={TYPO.muted}>{activeValue}</span>}
            </div>

            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
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
        <div className="mb-4 text-sm text-destructive">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full p-2 text-center">
        <div className="mb-4 text-lg font-semibold">Product not found</div>
        <Link
          href="/"
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
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
    images: baseImagesRaw = [],
  } = product;

  const displayPrice = pickPrice(matchedVariant?.price, basePrice, listPrice);
  const numericListPrice = Number(listPrice) || 0;
  const showListPrice = numericListPrice > displayPrice && displayPrice > 0;
  const displayQuantity = matchedVariant?.quantity ?? baseQuantity;

  // Merge base + variant images
  const baseImages = normalizeImages(baseImagesRaw);
  const variantImages = normalizeImages(matchedVariant?.images);

  const displayImages = useMemo(() => {
    if (variantImages.length > 0) {
      const variantSet = new Set(variantImages);
      return [
        ...variantImages,
        ...baseImages.filter((img) => !variantSet.has(img)),
      ];
    }
    return baseImages;
  }, [variantImages, baseImages]);

  const inStock = displayQuantity > 0;
  const stockStatus = inStock ? "In Stock" : "Out of Stock";

  const descriptionBlock = (
    <div className="mt-6">
      <h2 className={`${TYPO.sectionTitle} mb-3`}>Description</h2>
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
    <div className="w-full border-b-2 border-border bg-background px-3 py-2 md:px-8 md:py-6">
      <ProductViewAnalytics productId={params._id} />
      <div className="mx-auto max-w-6xl">
        {/* Top: images + info */}
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Left column */}
          <div className="md:w-1/2">
            {displayImages.length > 0 ? (
              <>
                {brand?.name && (
                  <Link
                    href={`/brandStore?brandId=${_id}`}
                    className={`mb-2 inline-block ${TYPO.muted} hover:text-primary`}
                  >
                    Visit{" "}
                    <span className="font-medium text-primary">
                      {brand.name}
                    </span>
                  </Link>
                )}
                <DetailImages file={displayImages} />
              </>
            ) : (
              <div className="flex w-full items-center justify-center rounded-lg bg-muted p-6 text-sm text-muted-foreground">
                No images available
              </div>
            )}

            <div className="hidden md:block">{descriptionBlock}</div>
          </div>

          {/* Right column */}
          <div className="text-foreground md:w-1/2">
            <h1 className={`${TYPO.pageTitle} mb-2`}>{name}</h1>

            <div className="mb-2 flex items-baseline gap-3">
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
              className={`mb-4 text-sm font-medium ${
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

            <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <CheckoutButton
                product={{ _id, name, price: displayPrice }}
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

            {isMobile && (
              <ProductAttributes product={product} variant="keyFeatures" />
            )}

            {shortDescription && (
              <div className="my-4">
                <p className={TYPO.muted}>{shortDescription}</p>
              </div>
            )}

            {isMobile && (
              <button
                type="button"
                onClick={() => setIsSpecsSheetOpen(true)}
                className="mt-4 flex w-full items-center justify-between text-foreground transition-colors"
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

            {!isMobile && (
              <ProductAttributes product={product} variant="both" />
            )}

            {isMobile && (
              <BottomSheet
                open={isSpecsSheetOpen}
                onClose={() => setIsSpecsSheetOpen(false)}
                title="Specifications"
              >
                <ProductAttributes product={product} variant="specifications" />
              </BottomSheet>
            )}
          </div>
        </div>

        {/* Mobile description */}
        <div className="md:hidden">{descriptionBlock}</div>

        {/* Related menus */}
        {menusLoading ? (
          <div className="mt-8 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <RelatedMenusRenderer menus={menus} />
        )}

        {/* Reviews */}
        <ExistingReviews reviews={product?.reviews} />
      </div>
    </div>
  );
}
