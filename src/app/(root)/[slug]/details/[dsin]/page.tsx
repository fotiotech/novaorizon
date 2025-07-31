"use client";

import { useUser } from "@/app/context/UserContext";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Loading from "@/app/loading";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";
import { Prices } from "@/components/cart/Prices";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { NextSeo } from "next-seo";
import { fetchProducts } from "@/fetch/fetchProducts";
import ReviewForm from "@/components/product/reviews/ProductReviews";
import ExistingReviews from "@/components/product/reviews/ExistingReviews";
import { useSession } from "next-auth/react";
import StarRating from "@/components/StarRating";

type Params = { slug: string; dsin: string };

export default function DetailsPage({ params }: { params: Params }) {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productData = useAppSelector((s) => s.product?.byId[params.dsin]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const product = productData;
  const related_products = productData?.related_products;

  // Load product on mount / dsin change
  useEffect(() => {
    setLoading(true);
    dispatch(fetchProducts(params.dsin)).finally(() => setLoading(false));
  }, [dispatch, params.dsin]);

  // Analytics event (view)
  useEffect(() => {
    if (product && user?.id) {
      dispatch({
        type: "userEvent/add",
        payload: {
          userId: user?.id,
          productId: params.dsin,
          eventType: "view",
        },
      });
    }
  }, [dispatch, product, user?.id, params.dsin]);

  useEffect(() => {
    if (!selectedVariant && product?.variants_options?.variants?.length > 0) {
      setSelectedVariant(product.variants_options.variants[0]);
    }
  }, [product]);

  if (loading || !product) {
    return <Loading loading={true} />;
  }

  // Merge variant values into product deeply
  const mergeVariantWithProduct = (base: any, variant: any): any => {
    const merged = structuredClone(base);

    const applyVariant = (obj: any): void => {
      Object.entries(variant).forEach(([key, value]) => {
        if (typeof value !== "object") {
          if (key in obj) obj[key] = value;
          for (const k in obj) {
            if (typeof obj[k] === "object") applyVariant(obj[k]);
          }
        }
      });
    };

    applyVariant(merged);
    return merged;
  };

  const mergedProduct = selectedVariant
    ? mergeVariantWithProduct(product, selectedVariant)
    : product;

  // Basic fields
  const title = mergedProduct.identification_branding?.name || "";
  const shortDescription = mergedProduct.descriptions?.short || "";
  const longDescription = mergedProduct.descriptions?.long || "";

  // Identification & Branding extras
  const manufacturer =
    mergedProduct.identification_branding?.manufacturer || "";
  const modelNumber = mergedProduct.identification_branding?.model_number || "";

  // Pricing & Availability
  const salePrice = mergedProduct.pricing_availability?.price;
  const currency = mergedProduct.pricing_availability?.currency || "cfa";
  const stockStatus =
    mergedProduct.pricing_availability?.stock_status || "Unknown";
  const stockQuantity = mergedProduct.pricing_availability?.quantity ?? 0;

  // Images array
  const images: string[] = [];
  if (mergedProduct.media_visuals?.main_image) {
    images.push(mergedProduct.media_visuals.main_image);
  }
  if (product.media_visuals?.gallery) {
    images.push(...mergedProduct.media_visuals.gallery);
  }

  // Key Features & Bullets
  const keyFeatures = (mergedProduct.key_features as any) || [];
  const bullets = (mergedProduct.bullets as any) || [];

  // Materials & Composition
  const primaryMaterial =
    mergedProduct.materials_composition?.primary_material || "";
  const secondaryMaterial =
    mergedProduct.materials_composition?.secondary_material || "";
  const compositionDetails =
    mergedProduct.materials_composition?.composition_details || "";

  // Logistics & Shipping
  const shippingWeight = mergedProduct.logistics_shipping?.shipping_weight;
  const shippingDims = mergedProduct.logistics_shipping?.shipping_dimensions;
  const originCountry = mergedProduct.logistics_shipping?.origin_country || "";
  const shippingClass = mergedProduct.logistics_shipping?.shipping_class || "";

  // Warranty & Returns
  const warrantyPeriod = mergedProduct.warranty_returns?.warranty_period || "";
  const returnPolicy = mergedProduct.warranty_returns?.return_policy || "";
  const reviews = mergedProduct.reviews_ratings || [];

  return (
    <div className="w-full bg-gray-100">
      <NextSeo title={`${title} | MyShop`} description={shortDescription} />

      <div className="flex flex-col xl:flex-row bg-white">
        {/* ====== Left/Main Column ====== */}
        <div className="flex-1 grid lg:grid-cols-2 gap-8 p-4">
          <div>
            {/* Brand link */}
            {product.identification_branding?.brand && (
              <Link
                href={`/brandStore?brandId=${product.identification_branding.brand?._id}`}
                className="text-blue-600 underline mb-2 block text-sm"
              >
                Visit {product.identification_branding.brand?.name || "—"} Store
              </Link>
            )}

            {/* Image carousel */}
            <DetailImages file={images} />
          </div>

          <div className="flex flex-col gap-3 ">
            {reviews.map((review: any) => (
              <div
                key={review.rating}
                className="flex justify-end items-center gap-1 lg:hidden"
              >
                <StarRating
                  rating={review.rating}
                  ratingCount={reviews.length}
                />{" "}
              </div>
            ))}

            {/* Title (desktop) */}
            <h1 className="text-lg text-gray-800 font-bold ">{title}</h1>

            {reviews.map((review: any) => (
              <div
                key={review.rating}
                className="flex justify-end items-center gap-1 hidden lg:block"
              >
                <StarRating
                  rating={review.rating}
                  ratingCount={reviews.length}
                />{" "}
              </div>
            ))}

            {product.variants_options?.variant_theme && (
              <div className="">
                <h3 className="text-sm font-bold text-gray-900">
                  {product.variants_options.variant_theme
                    .charAt(0)
                    .toUpperCase() +
                    product.variants_options.variant_theme.slice(1)}
                  :
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {product?.variants_options.variants?.map((variant: any) => {
                    const theme = product.variants_options.variant_theme; // e.g. "color", "size", "model"
                    const optionValue = variant[theme]; // dynamically get value by theme key

                    // If it's color, set button background accordingly
                    const color =
                      theme === "color" && typeof optionValue === "string"
                        ? optionValue.toLowerCase()
                        : undefined;

                    switch (theme) {
                      case "color":
                        return (
                          <button
                            key={variant._id}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            style={
                              color ? { backgroundColor: color } : undefined
                            }
                            className={`px-4 py-2 rounded-md border ${
                              selectedVariant?._id === variant._id
                                ? "border-indigo-600 border-3"
                                : "text-gray-900 border-gray-300"
                            }`}
                          >
                            {optionValue || "—"}
                          </button>
                        );
                      case "size":
                      case "model":
                        return (
                          <button
                            key={variant._id}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            className={`px-4 py-2 rounded-md border bg-gray-300 ${
                              selectedVariant?._id === variant._id
                                ? "border-indigo-600 border-3"
                                : "text-gray-900 border-gray-300"
                            }`}
                          >
                            {optionValue || "—"}
                          </button>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-2">
              {salePrice !== undefined && (
                <span className="text-3xl font-extrabold">
                  <Prices amount={salePrice} currency={currency} />
                </span>
              )}
            </div>
            {/* Stock status & quantity */}
            <div
              className={
                stockQuantity > 0
                  ? "text-green-600 font-medium"
                  : "text-red-500 font-medium"
              }
            >
              {stockStatus === "in_stock" ? "In Stock" : "Out of Stock"}
            </div>
            {/* Buttons */}
            <div className="flex gap-4">
              <CheckoutButton
                product={mergedProduct}
                width="w-1/2"
                bgColor="bg-gray-800"
              >
                Checkout
              </CheckoutButton>
              <AddToCart product={mergedProduct as any} />
            </div>
            {/* Short description */}
            {shortDescription && (
              <p className="text-gray-700 mt-4">{shortDescription}</p>
            )}
          </div>
        </div>

        {/* ====== Right Sidebar (Cart Preview) ====== */}
        <aside className="xl:w-1/4 bg-gray-50 p-4">
          <h2 className="font-bold text-lg mb-2">Your Cart</h2>
          {/* Insert cart items / summary here */}
        </aside>
      </div>

      {/* ================================================================================= */}
      {/* Below the main area: Multiple optional sections based on what’s in `product` */}
      {/* ================================================================================= */}
      <div className="lg:max-w-4xl mx-auto space-y-1 py-2">
        {/* ================================ */}
        {/* Identification & Branding Extras */}
        {/* ================================ */}
        {(manufacturer || modelNumber) && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Product Details
            </h2>
            <ul className="space-y-2">
              {manufacturer && (
                <li>
                  <span className="font-medium">Manufacturer:</span>{" "}
                  {manufacturer}
                </li>
              )}
              {modelNumber && (
                <li>
                  <span className="font-medium">Model Number:</span>{" "}
                  {modelNumber}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ================================ */}
        {/* Long Description */}
        {/* ================================ */}
        {longDescription && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Description
            </h2>
            <p className="text-gray-800 whitespace-pre-line">
              {longDescription}
            </p>
          </section>
        )}

        {/* ================================ */}
        {/* Product Specifications (existing) */}
        {/* ================================ */}
        {mergedProduct.product_specifications && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Product Specifications
            </h2>
            <ul className="w-full space-y-2">
              {/* 1) Render all top‐level fields except “dimensions” and “technical_specs” */}
              {Object.entries(mergedProduct.product_specifications).map(
                ([key, value]) => {
                  if (key === "dimensions" || key === "technical_specs") {
                    return null;
                  }
                  if (value === undefined || value === "") {
                    return null;
                  }

                  return (
                    <li key={key}>
                      <div className="grid grid-cols-2 lg:w-3/4">
                        <strong className="capitalize text-gray-700">
                          {key.replace(/_/g, " ")}
                        </strong>{" "}
                        <span>{String(value)}</span>
                      </div>
                    </li>
                  );
                }
              )}

              {/* 2) Render “dimensions” in its own <li> */}
              {product.product_specifications.dimensions && (
                <li key="dimensions">
                  <div className="grid grid-cols-2 lg:w-3/4">
                    <strong className="text-gray-700">Dimensions</strong>{" "}
                    <span>
                      {`${product.product_specifications.dimensions.length} x ${product.product_specifications.dimensions.width} x ${product.product_specifications.dimensions.height} ${product.product_specifications.dimensions.unit}`}
                    </span>
                  </div>
                </li>
              )}

              {/* 3) Render “technical_specs” as a nested list */}
              {mergedProduct.product_specifications.technical_specs && (
                <li key="technical_specs">
                  <ul className=" space-y-2 mt-1">
                    {Object.entries(
                      mergedProduct.product_specifications.technical_specs
                    ).map(([groupName, specs]) => {
                      // specs should be an object, e.g. { "Voltage compatibility": "220V" }
                      if (
                        specs === undefined ||
                        typeof specs !== "object" ||
                        Array.isArray(specs)
                      ) {
                        return null;
                      }

                      return (
                        <li key={groupName} className="flex flex-col gap-1">
                          <div className="mt-2">
                            <h3 className="font-bold">{groupName}</h3>
                          </div>
                          <ul className="space-y-1 mt-1">
                            {Object.entries(specs as any).map(
                              ([attrName, attrValue]) => {
                                // If the value is an array, join it with commas
                                const displayValue = Array.isArray(attrValue)
                                  ? (attrValue as any[]).join(", ")
                                  : String(attrValue);

                                return (
                                  <li key={attrName}>
                                    <div className="grid grid-cols-2 lg:w-3/4">
                                      <strong className="capitalize text-gray-700">
                                        {attrName.replace(/_/g, " ")}
                                      </strong>{" "}
                                      <span>{displayValue}</span>
                                    </div>
                                  </li>
                                );
                              }
                            )}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ================================ */}
        {/* Key Features & Bullets */}
        {/* ================================ */}
        {(keyFeatures.length > 0 || bullets.length > 0) && (
          <section className="bg-white shadow p-3 space-y-1">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Key Features &amp; Highlights
            </h2>

            {keyFeatures.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Key Features</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {keyFeatures.map((feat: any, idx: any) => (
                    <li key={`feat-${idx}`}>{feat}</li>
                  ))}
                </ul>
              </div>
            )}

            {bullets.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Bullets</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {bullets.map((b: any, idx: any) => (
                    <li key={`bullet-${idx}`}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="bg-white shadow p-3 space-y-1">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">
            Related Products
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {related_products?.map((relProd: any) => {
              const prod = relProd.product_id;
              const image = prod?.media_visuals?.main_image;
              const name =
                prod?.identification_branding?.name || "Unnamed Product";
              const sku = prod?.identification_branding?.sku || "No SKU";

              return (
                <Link
                  key={relProd._id}
                  href={"/undefined/details/" + relProd._id}
                  className="border rounded-lg p-4 flex flex-col gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="relative w-16 h-16 flex-shrink-0 mx-auto">
                    {image ? (
                      <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="bg-gray-200 w-full h-full rounded-md" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium truncate line-clamp-1">
                      {name}
                    </h3>
                    <p className="text-xs text-gray-500">SKU: {sku}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ================================ */}
        {/* Materials & Composition */}
        {/* ================================ */}
        {(primaryMaterial || secondaryMaterial || compositionDetails) && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Materials &amp; Composition
            </h2>
            <ul className="space-y-2">
              {primaryMaterial && (
                <li>
                  <span className="font-medium">Primary Material:</span>{" "}
                  {primaryMaterial}
                </li>
              )}
              {secondaryMaterial && (
                <li>
                  <span className="font-medium">Secondary Material:</span>{" "}
                  {secondaryMaterial}
                </li>
              )}
              {compositionDetails && (
                <li>
                  <span className="font-medium">Composition Details:</span>{" "}
                  <span className="whitespace-pre-line">
                    {compositionDetails}
                  </span>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ================================ */}
        {/* Logistics & Shipping */}
        {/* ================================ */}
        {(shippingWeight !== undefined ||
          shippingDims ||
          originCountry ||
          shippingClass) && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Logistics &amp; Shipping
            </h2>
            <ul className="space-y-2">
              {shippingWeight !== undefined && (
                <li>
                  <span className="font-medium">Shipping Weight:</span>{" "}
                  {shippingWeight}
                </li>
              )}
              {shippingDims && (
                <li>
                  <span className="font-medium">Shipping Dimensions:</span>{" "}
                  {`${shippingDims.length} x ${shippingDims.width} x ${shippingDims.height} ${shippingDims.unit}`}
                </li>
              )}
              {originCountry && (
                <li>
                  <span className="font-medium">Origin Country:</span>{" "}
                  {originCountry}
                </li>
              )}
              {shippingClass && (
                <li>
                  <span className="font-medium">Shipping Class:</span>{" "}
                  {shippingClass}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ================================ */}
        {/* Warranty & Returns */}
        {/* ================================ */}
        {(warrantyPeriod || returnPolicy) && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Warranty &amp; Returns
            </h2>
            <ul className="space-y-2">
              {warrantyPeriod && (
                <li>
                  <span className="font-medium">Warranty Period:</span>{" "}
                  {warrantyPeriod}
                </li>
              )}
              {returnPolicy && (
                <li>
                  <span className="font-medium">Return Policy:</span>{" "}
                  <span className="whitespace-pre-line">{returnPolicy}</span>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ================================ */}
        {/* Gallery (if multiple images) */}
        {/* ================================ */}
        {images.length > 1 && (
          <section className="bg-white shadow p-3">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              Product Gallery
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt={`${title} view ${i + 1}`}
                  width={400}
                  height={400}
                  className="rounded-md shadow"
                />
              ))}
            </div>
          </section>
        )}

        <div>
          <ReviewForm productId={params.dsin} userId={user?.id as string} />
          <ExistingReviews reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
