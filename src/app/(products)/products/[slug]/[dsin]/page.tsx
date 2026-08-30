"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useCallback, useEffect, useState, use, useRef } from "react";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./_compnents/ProductViewAnalytics";
import ReviewForm from "@/components/product/reviews/ProductReviews";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";
import { useProductData } from "./_compnents/hooks";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { getCarriers } from "@/app/actions/carrier";
import { useUserData } from "@/app/context/UserDataContext";
import Image from "next/image";
import { getMenusByLocation } from "@/app/actions/menu";
import Carousel from "@/components/Carousel";

// ---------- Types ----------
interface AttributeUnitFamily {
  id: string;
  name: string;
  baseUnit: string;
}

interface MappedAttribute {
  id: string;
  code: string;
  name: string;
  type: string;
  options: string[];
  isRequired: boolean;
  unitFamily: AttributeUnitFamily | null;
  sortOrder: number;
}

interface GroupNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: MappedAttribute[];
  children: GroupNode[];
}

interface AttributeSetResult {
  id: string;
  title: string;
  code: string;
  groups: GroupNode[];
}

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
  dsin: string;
}

// ---------- Helpers ----------
function getFirstImage(val: any): string | null {
  if (!val) return null;
  if (Array.isArray(val) && val.length > 0) return val[0];
  if (typeof val === "string") return val;
  return null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applyVariant(product: any, variant: any) {
  if (!product || !variant) return product;
  const merged = JSON.parse(JSON.stringify(product));
  for (const key of Object.keys(variant)) {
    merged[key] = variant[key];
  }

  // Normalize main_image and gallery
  const vMain = variant.main_image;
  const vGallery = variant.gallery;

  if (typeof vMain === "string" && vMain) {
    merged.main_image = vMain;
    if (!Array.isArray(merged.gallery)) {
      merged.gallery = [vMain];
    } else if (!merged.gallery.includes(vMain)) {
      merged.gallery = [vMain, ...merged.gallery];
    }
  } else if (Array.isArray(vMain) && vMain.length > 0) {
    merged.main_image = vMain[0];
    merged.gallery = vMain;
  }

  if (Array.isArray(vGallery) && vGallery.length > 0) {
    merged.gallery = vGallery;
    if (!merged.main_image) {
      merged.main_image = vGallery[0];
    }
  }

  if (!merged.gallery || !Array.isArray(merged.gallery)) {
    merged.gallery = merged.main_image ? [merged.main_image] : [];
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

// ---------- Component: Specifications Table ----------
const SpecificationTable: React.FC<{
  set: AttributeSetResult;
  product: any;
}> = ({ set, product }) => {
  const renderGroup = (group: GroupNode, level: number = 0) => {
    const hasAttributes = group.attributes && group.attributes.length > 0;
    const hasChildren = group.children && group.children.length > 0;

    if (!hasAttributes && !hasChildren) return null;

    return (
      <div key={group.id} className={``}>
        <h3 className={`font-semibold text-neutral-600 mb-1`}>{group.name}</h3>
        {hasAttributes && (
          <table className="min-w-full border-collapse border border-border">
            <tbody>
              {group.attributes.map((attr) => {
                const value = product?.[attr.code];
                if (value === undefined || value === null) return null;
                return (
                  <tr key={attr.id} className="border-b border-border">
                    <th className="py-1 px-3 text-left font-medium capitalize w-1/3 bg-muted/50">
                      {attr.name}
                    </th>
                    <td className="py-1 px-3 text-foreground">
                      {renderAttributeValue(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {hasChildren && (
          <div className="mt-2">
            {group.children.map((child) => renderGroup(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-2">{set.title}</h2>
      {set.groups.map((group) => renderGroup(group, 0))}
    </div>
  );
};

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
    <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
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
  onSelect: (variant: any) => void;
  isActive: boolean;
}> = ({ variant, onSelect, isActive }) => {
  const image =
    getFirstImage(variant.main_image) || getFirstImage(variant.gallery);
  const price = variant.sale_price ?? variant.list_price ?? variant.price ?? 0;

  const themeKeys = Object.keys(variant).filter(
    (key) =>
      ![
        "_id",
        "sku",
        "price",
        "sale_price",
        "list_price",
        "quantity",
        "main_image",
        "gallery",
        "stock",
        "stock_status",
        "createdAt",
        "updatedAt",
        "__v",
      ].includes(key),
  );

  return (
    <div
      onClick={() => onSelect(variant)}
      className={`min-w-[100px] max-w-[130px] flex-shrink-0 border rounded-lg p-1 bg-background hover:shadow-md transition-all cursor-pointer flex flex-col ${
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : " hover:border-primary/50"
      }`}
    >
      {themeKeys.length > 0 && (
        <div className="text-[10px] text-muted-foreground truncate mb-0.5">
          {themeKeys.map((key) => (
            <span key={key} className="mr-1">
              {key}: {variant[key]}
            </span>
          ))}
        </div>
      )}
      {image ? (
        <div className="relative aspect-square w-full h-16">
          <Image
            src={image}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="w-full h-16 bg-muted flex items-center justify-center text-muted-foreground text-xs">
          No image
        </div>
      )}
      <div className="mt-0.5 w-full">
        <div className="font-semibold text-xs text-primary">
          {typeof price === "number" ? `${price} CFA` : "Price unavailable"}
        </div>
      </div>
    </div>
  );
};

// ---------- Component: Menu-based Related Products Renderer ----------
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
                            {item.price} CFA
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
          <div key={_id} className="menu-node p-3 bg-white rounded shadow">
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

// ---------- Main Page Component ----------
export default function Details(props: { params: Promise<Params> }) {
  const params = use(props.params);
  const { product, loading, error, setProduct } = useProductData(params?.dsin);
  const [attributeSets, setAttributeSets] = useState<AttributeSetResult[]>([]);
  const [setsLoading, setSetsLoading] = useState<boolean>(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<
    number | null
  >(null);
  const initialLoadComplete = useRef(false);

  const categoryId = product?.category_id?._id ?? product?.category_id;
  const { data: session } = useSession();
  const user = session?.user as any;
  const { addresses: userAddresses } = useUserData();

  // State for related product menus
  const [menus, setMenus] = useState<any[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);

  // Fetch menus for "product_related" location with product context
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

  // Fetch attribute sets
  useEffect(() => {
    if (!categoryId) {
      setSetsLoading(false);
      return;
    }
    setSetsLoading(true);
    getCategoryAttributeSets(categoryId as string)
      .then((sets) => {
        setAttributeSets(sets);
        setSetsError(null);
      })
      .catch((err) => {
        console.error("Failed to load attribute sets:", err);
        setSetsError("Could not load product specifications.");
      })
      .finally(() => setSetsLoading(false));
  }, [categoryId]);

  // Active variant detection & initial sync
  useEffect(() => {
    if (
      !product ||
      !product.variants ||
      product.variants.length === 0 ||
      initialLoadComplete.current
    ) {
      return;
    }

    const firstVariant = product.variants[0];
    const themeKeys = Object.keys(firstVariant).filter(
      (key) =>
        ![
          "_id",
          "sku",
          "price",
          "sale_price",
          "list_price",
          "quantity",
          "main_image",
          "gallery",
          "stock",
          "stock_status",
          "createdAt",
          "updatedAt",
          "__v",
        ].includes(key),
    );

    let foundIndex = -1;
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      let matches = true;
      for (const key of themeKeys) {
        if (product[key] !== undefined && product[key] !== variant[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      foundIndex = 0;
      const merged = applyVariant(product, product.variants[0]);
      setProduct(merged);
    } else {
      const currentVariant = product.variants[foundIndex];
      let needsUpdate = false;
      for (const key of Object.keys(currentVariant)) {
        if (
          ![
            "_id",
            "sku",
            "quantity",
            "main_image",
            "gallery",
            "stock",
            "stock_status",
            "createdAt",
            "updatedAt",
            "__v",
          ].includes(key) &&
          product[key] !== currentVariant[key]
        ) {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        const merged = applyVariant(product, currentVariant);
        setProduct(merged);
      }
    }

    setSelectedVariantIndex(foundIndex);
    initialLoadComplete.current = true;
  }, [product, setProduct]);

  const handleVariantSelect = useCallback(
    (variant: any, index: number) => {
      if (product) {
        const merged = applyVariant(product, variant);
        setProduct(merged);
        setSelectedVariantIndex(index);
      }
    },
    [product, setProduct],
  );

  if (loading) return <Spinner size={32} />;
  if (error)
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
  if (!product)
    return (
      <div className="w-full p-8 text-center">
        <div className="text-xl mb-4">Product not found</div>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Back to Home
        </Link>
      </div>
    );

  // ProductBasicInfo component (unchanged)
  const ProductBasicInfo = () => {
    const {
      _id = "",
      brand,
      title = "Untitled Product",
      model = "",
      list_price = 0,
      sale_price,
      gallery = [],
      stock_status = [],
      main_image = "",
      condition = [],
      short_desc = "",
      variants = [],
    } = product || {};

    const displayPrice = sale_price ?? list_price ?? 0;

    return (
      <>
        <div className="flex flex-col md:flex-row gap-4">
          {Array.isArray(gallery) && gallery.length > 0 ? (
            <div className="md:w-1/2">
              {brand?.name && (
                <Link href={`/brandStore?brandId=${_id}`} className="">
                  visit <span className="text-primary">{brand?.name}</span>
                </Link>
              )}
              <DetailImages file={gallery} />
            </div>
          ) : (
            <div className="w-full md:w-1/2 flex items-center justify-center bg-muted text-muted-foreground rounded p-6">
              No images available
            </div>
          )}

          <div className="md:w-1/2 text-foreground">
            <h1 className="text-sm font-bold text-muted-foreground lg:text-lg mb-2">
              {title} {model}
            </h1>

            {typeof displayPrice === "number" && (
              <div className="text-2xl font-semibold mb-2">
                {displayPrice} CFA
              </div>
            )}

            {Array.isArray(stock_status) && stock_status.length > 0 && (
              <div
                className={`${
                  stock_status.join(", ") === "In Stock"
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                } mb-2`}
              >
                {stock_status.join(", ")}
              </div>
            )}

            {/* Variant Cards */}
            {Array.isArray(variants) && variants.length > 0 && (
              <div className="mb-2">
                <h3 className="text-sm font-medium mb-1">Available Variants</h3>
                <div className="flex overflow-x-auto gap-2 pb-1 md:grid md:grid-cols-2 lg:grid-cols-3 scrollbar-hide">
                  {variants.map((v: any, idx: number) => (
                    <VariantCard
                      key={idx}
                      variant={v}
                      onSelect={(variant) => handleVariantSelect(variant, idx)}
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
                  name: title,
                  main_image,
                  price: displayPrice,
                }}
                width="w-full"
              >
                Checkout
              </CheckoutButton>
              <AddToCart
                product={{
                  _id,
                  name: title,
                  image: main_image,
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

        <div className="my-3 rounded grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.isArray(condition) && condition.length > 0 && (
            <div>
              <span className="font-semibold">Condition:</span>{" "}
              {condition.join(", ")}
            </div>
          )}
        </div>

        {short_desc && (
          <div className="my-3 rounded">
            <p className="text-muted-foreground text-sm">{short_desc}</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="w-full bg-background border-b-2 border-border py-1 md:py-3 px-4 md:px-8">
      <ProductViewAnalytics productId={params.dsin} />
      <div className="max-w-6xl mx-auto">
        <ProductBasicInfo />

        {setsLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : setsError ? (
          <div className="mt-4 text-destructive">{setsError}</div>
        ) : attributeSets.length > 0 ? (
          <div className="mt-4 space-y-4">
            {attributeSets.map((set) => {
              if (set.code === "specifications") {
                return (
                  <SpecificationTable
                    key={set.id}
                    set={set}
                    product={product}
                  />
                );
              }
              return null;
            })}
          </div>
        ) : null}

        <div className="mt-4 bg-background rounded">
          <h2 className="text-lg font-semibold mb-1">Description</h2>
          {product.long_desc ? (
            <div
              className="prose max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: product.long_desc }}
            />
          ) : (
            <p className="text-muted-foreground">No description available.</p>
          )}
        </div>

        {/* Render related product menus */}
        {menusLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <RelatedMenusRenderer menus={menus} />
        )}

        <div className="mt-4 bg-background rounded">
          <ReviewForm productId={product._id} userId={user?._id} />
          <ExistingReviews reviews={product?.reviews} />
        </div>
      </div>
    </div>
  );
}
