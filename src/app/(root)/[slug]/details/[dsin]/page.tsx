"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
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
import { getCarriers } from "@/app/actions/carrier"; // 👈 new import
import { useUserData } from "@/app/context/UserDataContext"; // 👈 new import

// ---------- Types (same as before) ----------
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

// Carrier type (simplified)
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

// ---------- Helper to merge variant into product ----------
function applyVariant(product: any, variant: any) {
  if (!product || !variant) return product;
  const merged = JSON.parse(JSON.stringify(product));
  for (const key of Object.keys(variant)) {
    merged[key] = variant[key];
  }
  return merged;
}

// ---------- Helper to render a single attribute value ----------
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

// ---------- Helper: check if a carrier serves a given address ----------
function doesCarrierServeAddress(carrier: Carrier, address: any): boolean {
  if (!address) return false;
  // Build a list of strings to match against carrier's regions
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

// ---------- Component: Specifications Table (only for "specification" set) ----------
const SpecificationTable: React.FC<{
  set: AttributeSetResult;
  product: any;
}> = ({ set, product }) => {
  const renderGroup = (group: GroupNode, level: number = 0) => {
    const hasAttributes = group.attributes && group.attributes.length > 0;
    const hasChildren = group.children && group.children.length > 0;

    if (!hasAttributes && !hasChildren) return null;

    return (
      <div key={group.id} className={`mb-6 ${level > 0 ? "ml-4 mt-4" : ""}`}>
        <h3
          className={`font-semibold ${level === 0 ? "text-lg" : "text-md"} mb-2`}
        >
          {group.name}
        </h3>
        {hasAttributes && (
          <table className="min-w-full border-collapse border border-gray-200">
            <tbody>
              {group.attributes.map((attr) => {
                const value = product?.[attr.code];
                if (value === undefined || value === null) return null;
                return (
                  <tr key={attr.id} className="border-b border-gray-200">
                    <th className="py-2 px-4 text-left font-medium capitalize w-1/3 bg-gray-50">
                      {attr.name}
                    </th>
                    <td className="py-2 px-4 text-gray-700">
                      {renderAttributeValue(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {hasChildren && (
          <div className="mt-4">
            {group.children.map((child) => renderGroup(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">{set.title}</h2>
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

  // Get the carrier IDs from the product's "carrier" attribute
  const carrierIds: string[] = product?.carrier || [];
  const hasCarriers = carrierIds.length > 0;

  // Fetch all carriers (we could also fetch only the needed ones, but this is simpler)
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

  // Determine which carriers serve the user's address (pick first address)
  const primaryAddress =
    userAddresses && userAddresses.length > 0 ? userAddresses[0] : null;
  const availableCarriers = carriers.filter((carrier) =>
    doesCarrierServeAddress(carrier, primaryAddress),
  );

  // If no carriers selected for the product
  if (!hasCarriers) return null;

  if (loading)
    return (
      <div className="mt-4 text-gray-500">Loading shipping options...</div>
    );
  if (error) return <div className="mt-4 text-red-500">{error}</div>;

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Shipping Options</h3>
      {!primaryAddress ? (
        <p className="text-sm text-gray-600">
          Please{" "}
          <Link
            href="/account/addresses"
            className="text-blue-600 hover:underline"
          >
            add an address
          </Link>{" "}
          to check shipping availability.
        </p>
      ) : availableCarriers.length === 0 ? (
        <p className="text-sm text-gray-600">
          No carriers serve your region (
          {primaryAddress.city || primaryAddress.state || "your area"}).
        </p>
      ) : (
        <ul className="space-y-3">
          {availableCarriers.map((carrier) => {
            // Find the matching region details for this address
            const regionDetail = carrier.regionsServed.find((r) =>
              doesCarrierServeAddress(carrier, primaryAddress),
            );
            return (
              <li
                key={carrier._id}
                className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0"
              >
                <div>
                  <span className="font-medium">{carrier.name}</span>
                  {regionDetail && (
                    <span className="text-sm text-gray-600 ml-2">
                      (Est. delivery: {regionDetail.averageDeliveryTime})
                    </span>
                  )}
                </div>
                {regionDetail && (
                  <span className="font-semibold text-indigo-600">
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

// ---------- Main Page Component ----------
export default function Details({ params }: { params: Params }) {
  const { product, loading, error, setProduct } = useProductData(params?.dsin);
  const [attributeSets, setAttributeSets] = useState<AttributeSetResult[]>([]);
  const [setsLoading, setSetsLoading] = useState<boolean>(true);
  const [setsError, setSetsError] = useState<string | null>(null);

  const categoryId = product?.category_id?._id ?? product?.category_id;
  const { data: session } = useSession();
  const user = session?.user as any;

  // Get user addresses from context
  const { addresses: userAddresses } = useUserData();

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

  const handleVariantSelect = useCallback(
    (variant: any) => {
      if (product) {
        const merged = applyVariant(product, variant);
        setProduct(merged);
      }
    },
    [product, setProduct],
  );

  // ----- Loading & Error states -----
  if (loading) return <Spinner size={32} />;
  if (error)
    return (
      <div className="w-full p-8 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </Link>
      </div>
    );

  // ----- ProductBasicInfo component (inline) -----
  const ProductBasicInfo = () => {
    const {
      _id = "",
      brand,
      title = "Untitled Product",
      model = "",
      list_price = 0,
      gallery = [],
      stock_status = [],
      main_image = "",
      condition = [],
      short_desc = "",
      variants = [],
    } = product || {};

    return (
      <>
        <div className="flex flex-col md:flex-row gap-6">
          {Array.isArray(gallery) && gallery.length > 0 ? (
            <div className="md:w-1/2">
              {brand?.name && (
                <Link href={`/brandStore?brandId=${_id}`} className="">
                  visit <span className="text-blue-600">{brand?.name}</span>
                </Link>
              )}
              <DetailImages file={gallery} />
            </div>
          ) : (
            <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-200 text-gray-500 rounded p-6">
              No images available
            </div>
          )}

          <div className="md:w-1/2 text-text">
            <h1 className="text-lg font-bold text-gray-800 mb-4">
              {title} {model}
            </h1>

            {typeof list_price === "number" && (
              <div className="text-2xl font-semibold mb-4">
                {list_price} CFA
              </div>
            )}

            {Array.isArray(stock_status) && stock_status.length > 0 && (
              <div
                className={`${
                  stock_status.join(", ") === "In Stock"
                    ? "text-green-600"
                    : "text-red-600"
                } mb-4`}
              >
                {stock_status.join(", ")}
              </div>
            )}

            {/* Variant selection */}
            {Array.isArray(variants) && variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Variant:
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {variants.map((v: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleVariantSelect(v)}
                      className="px-3 py-1 border rounded hover:bg-gray-100 transition-colors"
                    >
                      {v.sku || `Variant ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full">
              <CheckoutButton
                product={{
                  _id,
                  name: title,
                  main_image,
                  price: list_price,
                }}
                width="w-full"
                bgColor="bg-gray-800"
              >
                Checkout
              </CheckoutButton>
              <AddToCart
                product={{
                  _id,
                  name: title,
                  image: main_image,
                  price: list_price,
                }}
              />
            </div>

            {/* 👇 Insert Carrier Shipping Options here */}
            <CarrierShippingOptions
              product={product}
              userAddresses={userAddresses}
            />
          </div>
        </div>

        <div className="my-6 rounded grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(condition) && condition.length > 0 && (
            <div>
              <span className="font-semibold">Condition:</span>{" "}
              {condition.join(", ")}
            </div>
          )}
        </div>

        {short_desc && (
          <div className="my-6 rounded">
            <p className="text-gray-700">{short_desc}</p>
          </div>
        )}
      </>
    );
  };

  // ----- Main render -----
  return (
    <div className="w-full bg-white border-b-2 border-gray-300 p-4 md:p-8">
      <ProductViewAnalytics productId={params.dsin} />
      <div className="max-w-6xl mx-auto">
        <ProductBasicInfo />

        {/* Attribute sets – only render the "specification" set */}
        {setsLoading ? (
          <div className="mt-8 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : setsError ? (
          <div className="mt-8 text-red-500">{setsError}</div>
        ) : attributeSets.length > 0 ? (
          <div className="mt-8 space-y-8">
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

        {/* Long description */}
        {product.long_desc && (
          <div className="mt-8 bg-white rounded">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: product.long_desc }}
            />
          </div>
        )}

        {/* Related products */}
        {product.related_products?.ids?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.related_products.ids.map((related: any) => (
                <Link
                  key={related._id}
                  href={`/${related.url_slug || "product"}/details/${
                    related._id
                  }`}
                  className="flex flex-col gap-2 p-3 bg-white rounded shadow hover:shadow-md transition-shadow"
                >
                  {related.main_image && (
                    <ImageRenderer image={related.main_image} />
                  )}
                  <h3 className="font-medium text-sm line-clamp-2">
                    {related.title}
                  </h3>
                  {related.list_price && (
                    <p className="text-gray-700">{related.list_price} CFA</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews section */}
        <div className="mt-8 bg-white rounded">
          <ReviewForm productId={product._id} userId={user?._id} />
          <ExistingReviews reviews={product?.reviews} />
        </div>
      </div>
    </div>
  );
}
