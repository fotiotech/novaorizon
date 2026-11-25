"use client";

import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./ProductViewAnalytics";
import ExistingReviews from "@/app/(root)/products/[slug]/[_id]/_compnents/reviews/ExistingReviews";
import ReviewForm from "@/app/(root)/products/[slug]/[_id]/_compnents/reviews/ReviewForm";
import { getCarriers } from "@/lib/api/carrier";
import { useUserData } from "@/app/context/UserDataContext";
import { useCart } from "@/app/context/CartContext";
import { Prices } from "@/components/cart/Prices";
import Image from "next/image";
import { findProducts } from "@/lib/api/products";
import ProductAttributes from "./ProductAttributes";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LikeButton } from "@/components/content/LikeButton";
import { ShareButton } from "@/components/content/ShareButton";
import { WishlistButton } from "@/components/WishlistButton";
import {
  listActiveTrustBadges,
  type TrustBadgeDTO,
} from "@/lib/api/trust-badge";
import TrustBadgeStrip from "@/components/trust/TrustBadgeStrip";

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

interface ProductDetailsClientProps {
  productId: string;
  initialProduct?: any;
  relatedSlot?: React.ReactNode;
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
function promotionValueLabel(promotion: any): string {
  const type = promotion?.offer?.type ?? promotion?.calculationType;
  const value = promotion?.offer?.discountValue ?? promotion?.discount;
  switch (type) {
    case "percentage":
      return value != null ? `${value}% off` : "Percentage off";
    case "fixed":
    case "fixed_amount":
      return value != null ? `${value} off` : "Fixed discount";
    case "bogo":
    case "buy_x_get_y":
      return `Buy ${promotion?.offer?.buyQuantity ?? 1} get ${promotion?.offer?.getQuantity ?? 1}`;
    case "bundle":
    case "bundle_discount":
      return "Bundle discount";
    case "free_shipping":
      return "Free shipping";
    default:
      return "Offer";
  }
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

function getThemeKeys(product: any, variant: any): string[] {
  const declared = Array.isArray(product?.variantThemes)
    ? product.variantThemes
    : [];
  if (declared.length > 0) {
    return declared.map((c: any) => String(c)).filter(Boolean);
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

// ---------- Fade-preview section ----------
function FadePreview({
  id,
  title,
  expanded,
  onToggle,
  collapsedHeight = 220,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  collapsedHeight?: number;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      setOverflows(el.scrollHeight > collapsedHeight + 4);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsedHeight]);

  const showToggle = overflows;

  return (
    <section className="pt-6">
      <h2 className={`${TYPO.sectionTitle} mb-3`}>{title}</h2>

      <div className="relative">
        <div
          ref={contentRef}
          id={id}
          className="overflow-hidden transition-[max-height] duration-500 ease-out"
          style={{
            maxHeight:
              expanded || !showToggle ? "none" : `${collapsedHeight}px`,
          }}
        >
          {children}
        </div>

        {showToggle && !expanded && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/90 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={false}
                aria-controls={id}
                className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Expand all
              </button>
            </div>
          </>
        )}

        {showToggle && expanded && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={true}
              aria-controls={id}
              className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Show less
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Product Title ----------
function ProductTitle({
  name,
  brand,
}: {
  name: string;
  brand?: { _id?: string; name?: string } | null;
}) {
  if (!brand?.name) return <>{name}</>;

  const brandName = brand.name;
  const href = `/brandStore?brandId=${brand._id}`;

  const linkedBrand = (
    <Link href={href} className="font-semibold text-primary hover:underline">
      {brandName}
    </Link>
  );

  const startsWithBrand = name
    .toLowerCase()
    .startsWith(brandName.toLowerCase());

  if (startsWithBrand) {
    const rest = name.slice(brandName.length);
    return (
      <>
        {linkedBrand}
        {rest}
      </>
    );
  }

  return (
    <>
      {linkedBrand} {name}
    </>
  );
}

// ---------- Mini cart (desktop third column) ----------
function CartPreview() {
  const { items, subtotal, updateItem, removeItem, loading } = useCart();

  if (items.length === 0) {
    return (
      <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Your Cart
        </h3>
        <p className="text-xs text-muted-foreground">
          Your cart is empty. Add products to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Cart</h3>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {items.slice(0, 5).map((it: any) => (
          <li key={it._id} className="flex items-center gap-2">
            {it.image ? (
              <Image
                src={it.image}
                alt={it.name || "Cart item"}
                width={40}
                height={40}
                className="h-10 w-10 flex-shrink-0 rounded bg-muted object-contain"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {it.name}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateItem(it._id, it.quantity - 1)}
                  disabled={loading || it.quantity <= 1}
                  aria-label="Decrease quantity"
                  className="h-5 w-5 rounded border border-input text-xs leading-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-[1.25rem] text-center text-xs font-medium text-foreground">
                  {it.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateItem(it._id, it.quantity + 1)}
                  disabled={loading}
                  aria-label="Increase quantity"
                  className="h-5 w-5 rounded border border-input text-xs leading-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="whitespace-nowrap text-xs font-semibold text-foreground">
                <Prices amount={it.price * it.quantity} />
              </p>
              <button
                type="button"
                onClick={() => removeItem(it._id)}
                className="text-[10px] text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.length > 5 ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          +{items.length - 5} more item{items.length - 5 === 1 ? "" : "s"}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold text-foreground">
          <Prices amount={subtotal} />
        </span>
      </div>

      <Link
        href="/cart"
        className="mt-3 block w-full rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View Cart
      </Link>
    </div>
  );
}

function useShippingInfo(product: any, userAddresses: any[]) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCarriers()
      .then((data) => {
        if (!cancelled) setCarriers(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const carrierIds: string[] = Array.isArray(product?.carrier)
    ? product.carrier.map(String)
    : product?.carrier
      ? [String(product.carrier)]
      : [];
  const primaryAddress =
    userAddresses && userAddresses.length > 0 ? userAddresses[0] : null;
  const available = carriers.filter(
    (carrier) =>
      (carrierIds.length === 0 || carrierIds.includes(String(carrier._id))) &&
      doesCarrierServeAddress(carrier, primaryAddress),
  );
  const carrier = available[0] ?? null;
  const region =
    carrier && primaryAddress
      ? carrier.regionsServed.find((entry) =>
          doesCarrierServeAddress(carrier, primaryAddress),
        )
      : null;

  return { loading, primaryAddress, carrier, region };
}

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

// ---------- Main Client Component ----------
export default function ProductDetailsClient({
  productId,
  initialProduct,
  relatedSlot,
}: ProductDetailsClientProps) {
  const [product, setProduct] = useState<any>(initialProduct ?? null);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [error, setError] = useState<string | null>(null);

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {},
  );
  const [isSpecsSheetOpen, setIsSpecsSheetOpen] = useState(false);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const initialLoadComplete = useRef(false);

  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const toggleSpecs = useCallback(() => setSpecsExpanded((p) => !p), []);
  const toggleDescription = useCallback(
    () => setDescriptionExpanded((p) => !p),
    [],
  );

  const isMobile = useIsMobile();
  const { addresses: userAddresses, profile } = useUserData();

  // Fetch product — skipped when the server already provided it.
  useEffect(() => {
    if (!productId) {
      setError("No product ID provided");
      setLoading(false);
      return;
    }

    if (initialProduct) {
      setProduct(initialProduct);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    findProducts(productId)
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
  }, [productId, initialProduct]);

  useEffect(() => {
    initialLoadComplete.current = false;
    setSelectedValues({});
    setIsSpecsSheetOpen(false);
    setIsReviewSheetOpen(false);
    setSpecsExpanded(false);
    setDescriptionExpanded(false);
  }, [productId]);

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

  const renderPromotions = Array.isArray(product.renderPromotions)
    ? product.renderPromotions
    : [];
  const displayPrice = pickPrice(matchedVariant?.price, basePrice, listPrice);
  const pricing = product.pricing as
    | { promotionalPrice?: number; originalPrice?: number }
    | undefined;
  const promotionalPrice = Number(pricing?.promotionalPrice ?? 0);
  const hasPromotionalPrice =
    promotionalPrice > 0 && promotionalPrice < displayPrice;
  const hasCartPricedPromotion = renderPromotions.some((promotion: any) =>
    [
      "bogo",
      "buy_x_get_y",
      "bundle",
      "bundle_discount",
      "free_shipping",
    ].includes(promotion?.offer?.type ?? promotion?.calculationType),
  );
  const numericListPrice = Number(listPrice) || 0;
  const showListPrice = numericListPrice > displayPrice && displayPrice > 0;
  // Per-variant stock: units promised to open orders are already reserved.
  const variantAvailable =
    matchedVariant !== null && matchedVariant !== undefined
      ? Math.max(
          0,
          (Number(matchedVariant.quantity) || 0) -
            (Number(matchedVariant.reserved) || 0),
        )
      : null;
  const displayQuantity = variantAvailable ?? baseQuantity;

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
  const shipping = useShippingInfo(product, userAddresses);
  const [trustBadges, setTrustBadges] = useState<TrustBadgeDTO[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);

  useEffect(() => {
    const average = shipping.region?.averageDeliveryTime;
    if (!average) {
      setDeliveryDate(null);
      return;
    }
    const numbers = average.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length === 0) {
      setDeliveryDate(average);
      return;
    }
    const date = new Date();
    date.setDate(date.getDate() + Math.max(...numbers));
    setDeliveryDate(
      date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
  }, [shipping.region?.averageDeliveryTime]);

  useEffect(() => {
    let cancelled = false;
    listActiveTrustBadges()
      .then((badges) => {
        if (!cancelled) setTrustBadges(badges);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-3 py-2 lg:px-6 lg:py-3 mb-2 bg-background rounded-xl border border-border">
      <ProductViewAnalytics productId={productId} />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
          {/* Row 1 / Col 1 — images */}
          <div>
            {displayImages.length > 0 ? (
              <DetailImages file={displayImages} />
            ) : (
              <div className="flex w-full items-center justify-center rounded-lg bg-muted p-6 text-sm text-muted-foreground">
                No images available
              </div>
            )}
          </div>

          {/* Row 1 / Col 2 — transactional info */}
          <div className="text-foreground lg:pt-6">
            {/* Title row — like + share live at the right edge */}
            <div className="mb-2 flex items-start justify-between gap-3">
              <h1 className={TYPO.pageTitle}>
                <ProductTitle name={name} brand={brand} />
              </h1>
              <div className="flex flex-shrink-0 items-center gap-2">
                {/* <LikeButton itemId={_id} size="md" /> */}
                <WishlistButton productId={_id} />
                <ShareButton title={name} productId={_id} size="md" />
              </div>
            </div>

            <div className="mb-2 flex items-baseline gap-3">
              <p className={TYPO.price}>
                {displayPrice > 0
                  ? formatPrice(
                      hasPromotionalPrice ? promotionalPrice : displayPrice,
                    )
                  : "Price on request"}
              </p>
              {hasPromotionalPrice ? (
                <p className="text-sm text-muted-foreground line-through">
                  {formatPrice(displayPrice)}
                </p>
              ) : showListPrice ? (
                <p className="text-sm text-muted-foreground line-through">
                  {formatPrice(numericListPrice)}
                </p>
              ) : null}
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div
                className={`text-sm font-medium ${
                  inStock
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                }`}
              >
                {stockStatus}
              </div>
              <div className="min-w-0 max-w-full break-words text-xs text-muted-foreground">
                {shipping.loading
                  ? "Checking shipping…"
                  : `Estimated delivery date: ${
                      deliveryDate ?? "calculated at checkout"
                    }, shipping to ${profile?.name || "you"} at ${
                      shipping.primaryAddress
                        ? [
                            shipping.primaryAddress.city,
                            shipping.primaryAddress.state,
                            shipping.primaryAddress.country,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : "your address"
                    }.`}
              </div>
            </div>

            {hasPromotionalPrice && (
              <p className="mb-2 text-[11px] text-muted-foreground">
                Promotional price — discount is applied automatically at
                checkout.
              </p>
            )}
            {!hasPromotionalPrice && hasCartPricedPromotion && (
              <p className="mb-2 text-[11px] text-muted-foreground">
                This offer is calculated in your cart (quantities/eligibility
                may apply).
              </p>
            )}

            {renderPromotions.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {renderPromotions.map((promotion: any) => (
                    <span
                      key={promotion._id}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      {promotion.label}
                    </span>
                  ))}
                </div>

                {/* {renderPromotions.map((promotion: any) => (
                  <div
                    key={`detail-${promotion._id}`}
                    className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {promotion.name}
                      </p>
                      <span className="text-xs font-medium text-primary">
                        {promotionValueLabel(promotion)}
                      </span>
                    </div>
                    {promotion.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {promotion.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {promotion.code ? `Code ${promotion.code} · ` : ""}
                      {promotion.endDate
                        ? `Valid until ${new Date(promotion.endDate).toLocaleDateString()}`
                        : "Limited time"}
                    </p>
                  </div>
                ))} */}
              </div>
            )}

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
                variant={
                  matchedVariant
                    ? String(
                        matchedVariant.variantId ??
                          matchedVariant._id ??
                          matchedVariant.sku ??
                          "",
                      ) || null
                    : null
                }
              />
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground">
                Shipped by:{" "}
                <span className="font-medium text-foreground">
                  {shipping.carrier?.name ?? "Store fulfillment"}
                </span>
                {shipping.region?.averageDeliveryTime
                  ? ` · ${shipping.region.averageDeliveryTime}`
                  : ""}
              </p>
              {trustBadges.length > 0 && (
                <TrustBadgeStrip
                  badges={trustBadges}
                  orientation="vertical"
                  flat
                />
              )}
            </div>

            {shortDescription && (
              <div className="my-4">
                <p className={TYPO.muted}>{shortDescription}</p>
              </div>
            )}

            {isMobile && (
              <>
                <ProductAttributes
                  product={product}
                  selectedVariant={matchedVariant}
                  variant="keyFeatures"
                />

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

                <BottomSheet
                  open={isSpecsSheetOpen}
                  onClose={() => setIsSpecsSheetOpen(false)}
                  title="Specifications"
                >
                  <ProductAttributes
                    product={product}
                    selectedVariant={matchedVariant}
                    variant="specifications"
                  />
                </BottomSheet>
              </>
            )}
          </div>

          {/* Rows 1-2 / Col 3 — mini cart (lg+) */}
          <div className="hidden lg:row-span-2 lg:block">
            <CartPreview />
          </div>

          <div className="border-t border-border md:col-span-2">
            {!isMobile && (
              <>
                <ProductAttributes
                  product={product}
                  selectedVariant={matchedVariant}
                  variant="keyFeatures"
                />

                <FadePreview
                  id="product-specifications-section"
                  title="Specifications"
                  expanded={specsExpanded}
                  onToggle={toggleSpecs}
                  collapsedHeight={260}
                >
                  <ProductAttributes
                    product={product}
                    selectedVariant={matchedVariant}
                    variant="specifications"
                  />
                </FadePreview>
              </>
            )}

            <FadePreview
              id="product-description-section"
              title="Description"
              expanded={descriptionExpanded}
              onToggle={toggleDescription}
              collapsedHeight={420}
            >
              {description ? (
                <div
                  className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_img]:rounded-md [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_p]:my-2"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <p className={TYPO.muted}>No description available.</p>
              )}
            </FadePreview>
          </div>
        </div>

        {relatedSlot ? (
          <div className="mt-6 border-t border-border pt-4">{relatedSlot}</div>
        ) : null}

        <ExistingReviews
          reviews={product?.reviewsRatings}
          onWriteReview={() => setIsReviewSheetOpen(true)}
        />

        <BottomSheet
          open={isReviewSheetOpen}
          onClose={() => setIsReviewSheetOpen(false)}
          title="Write a review"
        >
          <ReviewForm
            productId={productId}
            onSuccess={() => setIsReviewSheetOpen(false)}
          />
        </BottomSheet>
      </div>
    </div>
  );
}