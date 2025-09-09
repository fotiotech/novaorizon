"use client";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Loading from "@/app/loading";
import React, { useEffect, useState } from "react";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import DetailImages from "@/components/DetailImages";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import { findGroup } from "@/app/actions/attributegroup";
import ImageRenderer from "@/components/ImageRenderer";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { find_category_attribute_groups } from "@/app/actions/category";

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

interface RelatedProduct {
  _id: string;
  url_slug?: string;
  title?: string;
  main_image?: string;
  list_price?: number;
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

export default function DetailsPage({ params }: { params: Params }) {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const baseProduct = useAppSelector((s) => s.product?.byId?.[params?.dsin]);
  const [product, setProduct] = useState<any>(baseProduct);
  const [loading, setLoading] = useState(!baseProduct);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    media_visuals: true,
    basic_information: true,
  });

  // Toggle section expansion
  const toggleSection = (code: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Variant selection handler
  const handleVariantSelect = (variant: any) => {
    if (baseProduct) {
      const merged = applyVariant(baseProduct, variant);
      setProduct(merged);
    }
  };

  // Load product only if not already in store
  useEffect(() => {
    if (!params?.dsin) return;

    if (!baseProduct) {
      setLoading(true);
      dispatch(fetchProducts(params.dsin))
        .catch((err) => {
          console.error("Failed to fetch product", err);
          setError("Failed to load product");
        })
        .finally(() => setLoading(false));
    } else {
      setProduct(baseProduct);
    }

    (async () => {
      try {
        const res = await find_category_attribute_groups(product.category_id);
        if (Array.isArray(res)) {
          setGroups(res);
          const initialExpanded: Record<string, boolean> = {};
          res.forEach((group) => {
            initialExpanded[group.code] = expandedSections[group.code] || false;
          });
          setExpandedSections((prev) => ({ ...prev, ...initialExpanded }));
        } else {
          console.warn("findGroup returned unexpected format", res);
          setGroups([]);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
        setGroups([]);
      }
    })();
  }, [dispatch, params?.dsin, baseProduct]);

  // Analytics event (view)
  useEffect(() => {
    if (product && user?.id) {
      dispatch({
        type: "userEvent/add",
        payload: {
          userId: user.id,
          productId: params?.dsin,
          eventType: "view",
        },
      });
    }
  }, [dispatch, product, user?.id, params?.dsin]);

  const renderAttribute = (attribute: Attribute) => {
    if (!attribute) return;
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
        const relatedProducts = value as RelatedProduct[];
        if (!Array.isArray(relatedProducts) || relatedProducts.length === 0) {
          return null;
        }
        return (
          <div key={code} className="mt-6">
            <h2 className="text-lg font-semibold mb-4">{name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatedProducts.map((relatedProduct) => (
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
      default:
        if (value === undefined || value === null) return null;
        return (
          <div key={code} className="py-2">
            <span className="font-medium">{name}: </span>
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </div>
        );
    }
  };

  const CollapsibleSection = ({
    code,
    children,
    name,
    level = 0,
  }: {
    code: string;
    name?: string;
    children: React.ReactNode;
    level?: number;
  }) => {
    const isExpanded: boolean = expandedSections[code];
    const sectionId: string = `section-${code}`;

    return (
      <div className="mb-1 md:mb-2 rounded overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          className="w-full flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
          onClick={() => toggleSection(code)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleSection(code);
          }}
        >
          <h2
            className={`text-left ${
              level === 0 ? "text-xl font-semibold" : "text-md font-normal"
            }`}
          >
            {name || ""}
          </h2>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>

        <div
          id={sectionId}
          className={`overflow-auto transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  };

  const renderGroup = (group: AttributeGroup, level = 0) => {
    if (
      !group ||
      !group.code ||
      (group?.attributes?.length === 0 && group?.children?.length === 0)
    )
      return;

    const { code, name, attributes, children } = group;

    switch (code) {
      case "basic_information":
        const {
          _id = "",
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
                  <DetailImages file={gallery} />
                </div>
              ) : (
                <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-200 text-gray-500 rounded p-6">
                  No images available
                </div>
              )}

              <div className="md:w-1/2 text-text">
                <h1 className="text-2xl font-bold mb-4">
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
                        : ""
                    } mb-4`}
                  >
                    {stock_status.join(", ")}
                  </div>
                )}

                {/* Variant selection */}
                {Array.isArray(variants) && variants.length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-2 mt-2">
                      {variants.map((v: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => handleVariantSelect(v)}
                          className="p-3 py-1 border rounded hover:bg-gray-100"
                        >
                          {v.sku || `Variant ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                  <CheckoutButton
                    product={{
                      _id,
                      name: title,
                      main_image,
                      price: list_price,
                    }}
                    width="w-full sm:w-1/2"
                    bgColor="bg-gray-800"
                  >
                    Checkout
                  </CheckoutButton>
                  <AddToCart
                    product={{
                      _id,
                      name: title,
                      main_image,
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
      case "key_features":
        return (
          <CollapsibleSection key={code} code={code} name={name}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributes?.length > 0 &&
                attributes.map((attribute) => renderAttribute(attribute))}
            </div>
          </CollapsibleSection>
        );
      case "product_specifications":
        return (
          <div>
            <CollapsibleSection
              key={code}
              code={code}
              name={name}
              level={level}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attributes?.length > 0 &&
                  attributes?.map((attribute) => renderAttribute(attribute))}
              </div>
              {children.length > 0 &&
                children.map((child) => renderGroup(child, level + 1))}
            </CollapsibleSection>
          </div>
        );
      default:
        if (
          code === "identification_branding" ||
          code === "pricing_availability" ||
          code === "variants_options"
        )
          return;
        return (
          <CollapsibleSection key={code} code={code} name={name} level={level}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributes?.length > 0 &&
                attributes?.map((attribute) => renderAttribute(attribute))}
            </div>
            {children.length > 0 &&
              children.map((child) => renderGroup(child, level + 1))}
          </CollapsibleSection>
        );
    }
  };

  if (loading) return <Loading loading={true} />;
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
    <div className="w-full bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {groups.map((group) => renderGroup(group, 0))}
      </div>
    </div>
  );
}
