"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useCallback } from "react";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import ImageRenderer from "@/components/ImageRenderer";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./_compnents/ProductViewAnalytics";
import ReviewForm from "@/components/product/reviews/ProductReviews";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";
import { useProductData, useAttributeGroups } from "./_compnents/hooks";

interface Params {
  slug: string;
  dsin: string;
}

// Helper to merge variant into product
function applyVariant(product: any, variant: any) {
  if (!product || !variant) return product;
  const merged = JSON.parse(JSON.stringify(product));
  for (const key of Object.keys(variant)) {
    merged[key] = variant[key];
  }
  return merged;
}

// Helper to render a single attribute value, handling number+unit objects
function renderAttributeValue(value: any): string {
  if (value === undefined || value === null) return "";

  // Check if it's an object with value and unit (number with unit)
  if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    return `${value.value} ${value.unit}`;
  }

  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Recursive component to render attribute groups (specifications only)
interface AttributeRendererProps {
  attribute: { code: string; name: string };
  product: any;
}

const AttributeRenderer: React.FC<AttributeRendererProps> = ({ attribute, product }) => {
  const { code, name } = attribute;
  const value = product?.[code];
  if (value === undefined || value === null) return null;

  return (
    <div className="py-2 border-b border-gray-100">
      <span className="font-medium capitalize">{name}: </span>
      <span className="text-gray-700">{renderAttributeValue(value)}</span>
    </div>
  );
};

interface AttributeGroup {
  code: string;
  name: string;
  attributes: { code: string; name: string }[];
  children: AttributeGroup[];
}

interface SpecificationsRendererProps {
  groups: AttributeGroup[];
  product: any;
}

const SpecificationsRenderer: React.FC<SpecificationsRendererProps> = ({ groups, product }) => {
  // Find the group with code "product_specifications"
  const specsGroup = groups.find((g) => g.code === "product_specifications");
  if (!specsGroup) return null;

  // Recursive render function for groups
  const renderGroup = (group: AttributeGroup, skipOwnAttributes: boolean = false, level: number = 0) => {
    const hasAttributes = group.attributes && group.attributes.length > 0;
    const hasChildren = group.children && group.children.length > 0;

    if (!hasAttributes && !hasChildren) return null;

    return (
      <div key={group.code} className={`mb-6 ${level > 0 ? "ml-4 mt-4" : ""}`}>
        <h3 className={`font-semibold ${level === 0 ? "text-lg" : "text-md"} mb-2`}>
          {group.name}
        </h3>
        {!skipOwnAttributes && hasAttributes && (
          <table className="min-w-full border-collapse border border-gray-200">
            <tbody>
              {group.attributes.map((attr) => {
                const value = product?.[attr.code];
                if (value === undefined || value === null) return null;
                return (
                  <tr key={attr.code} className="border-b border-gray-200">
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
            {group.children.map((child) => renderGroup(child, false, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render the top-level group, skipping its own attributes (only children are shown)
  return <div className="mt-8">{renderGroup(specsGroup, true)}</div>;
};

export default function Details({ params }: { params: Params }) {
  const { product, loading, error, setProduct } = useProductData(params?.dsin);
  // Ensure category_id is a string (in case it's an object with _id)
  const categoryId = product?.category_id?._id ?? product?.category_id;
  const { groups, loading: groupsLoading } = useAttributeGroups(categoryId);
  const { data: session } = useSession();
  const user = session?.user as any;

  const handleVariantSelect = useCallback(
    (variant: any) => {
      if (product) {
        const merged = applyVariant(product, variant);
        setProduct(merged);
      }
    },
    [product, setProduct]
  );

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

  // Basic info component (images, title, price, variants, cart)
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
              <div className="text-2xl font-semibold mb-4">{list_price} CFA</div>
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

  return (
    <div className="w-full bg-white border-b-2 border-gray-300 p-4 md:p-8">
      <ProductViewAnalytics productId={params.dsin} />
      <div className="max-w-6xl mx-auto">
        <ProductBasicInfo />


        {/* Product specifications - rendered from attribute groups */}
        {groupsLoading ? (
          <div className="mt-8 flex justify-center">
            <Spinner size={24} />
          </div>
        ) : groups.length > 0 ? (
          <SpecificationsRenderer groups={groups} product={product} />
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