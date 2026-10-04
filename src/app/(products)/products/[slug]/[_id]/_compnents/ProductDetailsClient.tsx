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
import ExistingReviews from "@/app/(products)/products/[slug]/[_id]/_compnents/reviews/ExistingReviews";
import { getCarriers } from "@/app/actions/carrier";
import { useUserData } from "@/app/context/UserDataContext";
import { useCart } from "@/app/context/CartContext";
import { Prices } from "@/components/cart/Prices";
import Image from "next/image";
import { findProducts } from "@/app/actions/products";
import ProductAttributes from "./ProductAttributes";
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
// Shows a clipped preview of its children with a gradient fade at the bottom
// and an "Expand all" pill centered over the fade. Expanding reveals the full
// content and swaps the pill for a "Show less" link. The fade + pill are only
// rendered when the content actually overflows the collapsed height, so short
// sections don't get a pointless toggle.
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
  const initialLoadComplete = useRef(false);

  // Independent preview/expanded state for the two fade sections.
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const toggleSpecs = useCallback(() => setSpecsExpanded((p) => !p), []);
  const toggleDescription = useCallback(
    () => setDescriptionExpanded((p) => !p),
    [],
  );

  const isMobile = useIsMobile();
  const { addresses: userAddresses } = useUserData();

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

  const displayPrice = pickPrice(matchedVariant?.price, basePrice, listPrice);
  const numericListPrice = Number(listPrice) || 0;
  const showListPrice = numericListPrice > displayPrice && displayPrice > 0;
  const displayQuantity = matchedVariant?.quantity ?? baseQuantity;

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

  return (
    <div className="w-full border-b-2 border-border bg-background px-3 py-2 md:px-8 md:py-4">
      <ProductViewAnalytics productId={productId} />

      <div className="mx-auto max-w-7xl">
        {/*
          Single grid for the whole page body.

          Columns:
            - mobile  (< md): 1 col
            - md    (≥ md): 2 cols
            - lg    (≥ lg): 3 cols — [content | content | 280px cart]

          Rows:
            row 1  → images | info | mini cart (spans 2 rows)
            row 2  → attributes (plain key features + fade-preview specs)
                     and description (fade-preview)
        */}
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
            <h1 className={`${TYPO.pageTitle} mb-2`}>
              <ProductTitle name={name} brand={brand} />
            </h1>

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

            {shortDescription && (
              <div className="my-4">
                <p className={TYPO.muted}>{shortDescription}</p>
              </div>
            )}

            {isMobile && (
              <>
                <ProductAttributes product={product} variant="keyFeatures" />

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
                {/* Plain key features — no fade */}
                <ProductAttributes product={product} variant="keyFeatures" />

                {/* Fade-preview specifications */}
                <FadePreview
                  id="product-specifications-section"
                  title="Specifications"
                  expanded={specsExpanded}
                  onToggle={toggleSpecs}
                  collapsedHeight={260}
                >
                  <ProductAttributes
                    product={product}
                    variant="specifications"
                  />
                </FadePreview>
              </>
            )}

            {/* Fade-preview description */}
            <FadePreview
              id="product-description-section"
              title="Description"
              expanded={descriptionExpanded}
              onToggle={toggleDescription}
              collapsedHeight={420}
            >
              {description ? (
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <p className={TYPO.muted}>No description available.</p>
              )}
            </FadePreview>
          </div>
        </div>

        {/* Full-width rows below the grid */}
        {relatedSlot}
        <ExistingReviews reviews={product?.reviews} />
      </div>
    </div>
  );
}
