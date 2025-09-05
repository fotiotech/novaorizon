"use client";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Loading from "@/app/loading";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import Image from "next/image";
import DetailImages from "@/components/DetailImages";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";

type Params = { slug: string; dsin: string };
type Attribute = { code: string; name: string; value: any };
type ProductGroup = {
  code: string;
  name: string;
  attributes?: Attribute[];
  children?: ProductGroup[];
};

export default function DetailsPage({ params }: { params: Params }) {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productData = useAppSelector((s) => s.product?.byId[params.dsin]);
  const [loading, setLoading] = useState(!productData); // Only load if we don't have data
  const product = productData;

  // Load product only if not already in store
  useEffect(() => {
    if (!product) {
      setLoading(true);
      dispatch(fetchProducts(params.dsin)).finally(() => setLoading(false));
    }
  }, [dispatch, params.dsin, product]);

  // Analytics event (view) - only trigger when product and user are available
  useEffect(() => {
    if (product && user?.id) {
      dispatch({
        type: "userEvent/add",
        payload: {
          userId: user.id,
          productId: params.dsin,
          eventType: "view",
        },
      });
    }
  }, [dispatch, product, user?.id, params.dsin]);

  // Memoized function to extract special attributes
  const specialAttributes = useMemo(() => {
    if (!product) return {};

    const specials: Record<string, any> = {};
    const extractAttributes = (group: ProductGroup) => {
      if (group.attributes) {
        group.attributes.forEach((a: any) => {
          if (a?.main_image !== undefined) specials.main_image = a.main_image;
          if (a?.title !== undefined) specials.title = a.title;
          if (a?.list_price !== undefined) specials.list_price = a.list_price;
        });
      }

      if (group.children) {
        group.children.forEach(extractAttributes);
      }
    };

    if (Array.isArray(product.rootGroup)) {
      product.rootGroup.forEach(extractAttributes);
    } else if (product.rootGroup) {
      extractAttributes(product.rootGroup);
    }

    return specials;
  }, [product]);

  console.log("Special Attributes:", specialAttributes);

  // Memoized recursive rendering function for product details
  const renderProductDetails = useCallback((group: ProductGroup) => {
    return (
      <div className="p-4 bg-white mb-4">
        {/* <h2 className="text-2xl font-bold mb-4">{group.name}</h2> */}
        {group?.attributes && group?.attributes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.attributes
              .filter(
                (attr) =>
                  attr &&
                  attr.code &&
                  attr.value !== undefined &&
                  !["main_image", "title", "list_price", "_id"].includes(
                    attr.code
                  )
              )
              .map((attr) => (
                <div key={attr.name} className="mb-2">
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div>
                        <span className="font-semibold">{attr.name}: </span>
                        <span>{String(attr.value)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
        {group.children &&
          group.children.map((child) => (
            <div key={child.name} className="mt-4">
              {renderProductDetails(child)}
            </div>
          ))}
      </div>
    );
  }, []);

  if (loading) {
    return <Loading loading={true} />;
  }

  if (!product) {
    return <div className="w-full p-8 text-center">Product not found</div>;
  }

  return (
    <div className="w-full bg-gray-100 p-4">
      {/* Special attributes section */}
      <div className="flex flex-col md:flex-row gap-6">
        {specialAttributes?.main_image && (
          <div className="flex-shrink-0 w-full md:w-1/3">
            <div className="relative h-64 md:h-80 w-full">
              <DetailImages file={specialAttributes.gallery} />
            </div>
          </div>
        )}

        <div className="flex-grow">
          {specialAttributes?.title && (
            <h1 className="text-sm font-bold mb-4">
              {specialAttributes.title}
            </h1>
          )}

          {specialAttributes?.list_price && (
            <div className="text-2xl font-semibold mb-6">
              {specialAttributes.list_price} cfa
            </div>
          )}

          <div className="flex gap-4">
            <CheckoutButton
              product={{
                _id: product._id,
                name: specialAttributes?.title ?? "",
                main_image: specialAttributes?.main_image ?? "",
                price: specialAttributes?.list_price ?? 0,
              }}
              width="w-1/2"
              bgColor="bg-gray-800"
            >
              Checkout
            </CheckoutButton>
            <AddToCart
              product={
                {
                  _id: product._id,
                  name: specialAttributes?.title ?? "",
                  main_image: specialAttributes?.main_image ?? "",
                  price: specialAttributes?.list_price ?? 0,
                } as any
              }
            />
          </div>
        </div>
      </div>
      {/* Product details */}
      {renderProductDetails(product.rootGroup)}
    </div>
  );
}
