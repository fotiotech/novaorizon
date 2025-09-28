"use client";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Loading from "@/app/loading";
import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ImageRenderer from "@/components/ImageRenderer";
import ProductBasicInfo from "./_compnents/ProductBasicInfo";
import CollapsibleSection from "./_compnents/CollapsibleSection";
import {
  useProductData,
  useAttributeGroups,
  useExpandedSections,
} from "./_compnents/hooks";
import Spinner from "@/components/Spinner";
import ProductViewAnalytics from "./_compnents/ProductViewAnalytics";
import ReviewForm from "@/components/product/reviews/ProductReviews";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";

// Types
interface Params {
  slug: string;
  dsin: string;
}

interface Attribute {
  code: string;
  name: string;
}

interface AttributeGroup {
  code: string;
  name: string;
  attributes: Attribute[];
  children: AttributeGroup[];
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

// Sub-components

interface AttributeRendererProps {
  attribute: Attribute;
  product: any;
}

const AttributeRenderer: React.FC<AttributeRendererProps> = ({
  attribute,
  product,
}) => {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  if (!attribute) return null;
  const { code, name } = attribute;
  const value = product?.[code];

  switch (code) {
    case "long_desc":
      return (
        <div key={code} className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">{name}</h2>
          <p className="text-gray-700 text-sm">
            {value || "No description available"}
          </p>
        </div>
      );
    case "related_products":
      const relatedProducts = value;
      if (
        !Array.isArray(relatedProducts?.ids) ||
        relatedProducts?.ids?.length === 0
      ) {
        return null;
      }
      return (
        <div key={code} className="mt-6">
          <h2 className="text-lg font-semibold mb-4">{name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedProducts?.ids?.map((relatedProduct: any) => (
              <Link
                key={relatedProduct._id}
                href={`/${relatedProduct.url_slug || "product"}/details/${
                  relatedProduct._id
                }`}
                className="flex flex-col gap-2 p-3 bg-white rounded shadow hover:shadow-md transition-shadow"
              >
                {relatedProduct.main_image && (
                  <ImageRenderer image={relatedProduct.main_image} />
                )}
                <h3 className="font-medium text-sm line-clamp-2">
                  {relatedProduct.title}
                </h3>
                {relatedProduct.list_price && (
                  <p className="text-gray-700">
                    {relatedProduct.list_price} CFA
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      );
    case "reviews":
      return (
        <div key={code} className="mt-6 bg-white p-4 rounded shadow">
          <ReviewForm productId={product._id} userId={user?._id} />
          <ExistingReviews reviews={product?.reviews} />
        </div>
      );
    default:
      if (value === undefined || value === null|| code === 'rating') return null;
      return (
        <div key={code} className="py-2">
          <span className="font-medium">{name}: </span>
          {Array.isArray(value) ? value.join(", ") : String(value)}
        </div>
      );
  }
};

interface AttributeGroupRendererProps {
  group: AttributeGroup;
  product: any;
  level?: number;
  expandedSections: Record<string, boolean>;
  onToggleSection: (code: string) => void;
  onVariantSelect: (variant: any) => void;
}

const AttributeGroupRenderer: React.FC<AttributeGroupRendererProps> = ({
  group,
  product,
  level = 0,
  expandedSections,
  onToggleSection,
  onVariantSelect,
}) => {
  if (
    !group ||
    !group.code ||
    (group?.attributes?.length === 0 && group?.children?.length === 0)
  )
    return null;

  const { code, name, attributes, children } = group;

  // Skip these groups as they're handled elsewhere
  if (
    code === "product_identification" ||
    code === "pricing_inventory" ||
    code === "marketing" ||
    code === "variants_options"
  )
    return null;

  switch (code) {
    case "basic_information":
      return (
        <ProductBasicInfo product={product} onVariantSelect={onVariantSelect} />
      );
    case "key_features":
      return (
        <CollapsibleSection
          code={code}
          name={name}
          level={level}
          isExpanded={expandedSections[code]}
          onToggle={onToggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes?.length > 0 &&
              attributes.map((attribute) => (
                <AttributeRenderer
                  key={attribute.code}
                  attribute={attribute}
                  product={product}
                />
              ))}
          </div>
        </CollapsibleSection>
      );
    case "product_specifications":
      return (
        <CollapsibleSection
          code={code}
          name={name}
          level={level}
          isExpanded={expandedSections[code]}
          onToggle={onToggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes?.length > 0 &&
              attributes.map((attribute) => (
                <AttributeRenderer
                  key={attribute.code}
                  attribute={attribute}
                  product={product}
                />
              ))}
          </div>
          {children.length > 0 &&
            children.map((child) => (
              <AttributeGroupRenderer
                key={child.code}
                group={child}
                product={product}
                level={level + 1}
                expandedSections={expandedSections}
                onToggleSection={onToggleSection}
                onVariantSelect={onVariantSelect}
              />
            ))}
        </CollapsibleSection>
      );
    default:
      return (
        <CollapsibleSection
          code={code}
          name={name}
          level={level}
          isExpanded={expandedSections[code]}
          onToggle={onToggleSection}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes?.length > 0 &&
              attributes.map((attribute) => (
                <AttributeRenderer
                  key={attribute.code}
                  attribute={attribute}
                  product={product}
                />
              ))}
          </div>
          {children.length > 0 &&
            children.map((child) => (
              <AttributeGroupRenderer
                key={child.code}
                group={child}
                product={product}
                level={level + 1}
                expandedSections={expandedSections}
                onToggleSection={onToggleSection}
                onVariantSelect={onVariantSelect}
              />
            ))}
        </CollapsibleSection>
      );
  }
};

// Main component
export default function DetailsPage({ params }: { params: Params }) {
  const { product, loading, error, setProduct } = useProductData(params?.dsin);
  const groups = useAttributeGroups(product?.category_id);
  const { expandedSections, toggleSection } = useExpandedSections(groups);

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

  return (
    <div className="w-full bg-white border-b-2 border-gray-300 p-4 md:p-8">
      <ProductViewAnalytics productId={params.dsin} />
      <div className="max-w-6xl mx-auto">
        {groups.map((group) => (
          <AttributeGroupRenderer
            key={group.code}
            group={group}
            product={product}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onVariantSelect={handleVariantSelect}
          />
        ))}
      </div>
    </div>
  );
}
