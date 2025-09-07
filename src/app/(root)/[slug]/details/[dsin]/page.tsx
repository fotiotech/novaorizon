"use client";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import Loading from "@/app/loading";
import React, { useEffect, useState } from "react";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import DetailImages from "@/components/DetailImages";
import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";

// Types
interface Params {
  slug: string;
  dsin: string;
}

interface Product {
  _id: string;
  title?: string;
  main_image?: string;
  gallery?: string[];
  price?: number;
  shortDesc?: string;
  list_price?: number;
  sale_price?: number;
  msrp?: number;
  model?: string;
  sku?: string;
  condition?: string[];
  stock_status?: string[];
  quantity?: number;
}

export default function DetailsPage({ params }: { params: Params }) {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productData = useAppSelector((s) => s.product?.byId[params.dsin]);
  const [loading, setLoading] = useState(!productData);
  const product: Product | undefined = productData;

  // Load product only if not already in store
  useEffect(() => {
    if (!product) {
      setLoading(true);
      dispatch(fetchProducts(params.dsin)).finally(() => setLoading(false));
    }
  }, [dispatch, params.dsin, product]);

  // Analytics event (view)
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

  if (loading) {
    return <Loading loading={true} />;
  }

  if (!product) {
    return <div className="w-full p-8 text-center">Product not found</div>;
  }

  console.log("Rendering product details for:", product);

  return (
    <div className=" w-full bg-gray-100 p-4">
      {/* Gallery & main info */}
      <div className="flex flex-col  md:flex-row gap-6">
        {product.gallery && product.gallery.length > 0 && (
          <div className="">
            <DetailImages file={product.gallery} />
          </div>
        )}

        <div className=" text-text">
          <h1 className=" mb-4">{product?.title}</h1>

          {product?.list_price && (
            <div className="text-2xl font-semibold mb-2">
              {product.list_price} cfa
            </div>
          )}

          {product.stock_status && product.stock_status.length > 0 && (
            <div>{product.stock_status.join(", ")}</div>
          )}

          <div className="flex gap-4 mt-4">
            <CheckoutButton
              product={{
                _id: product._id,
                name: product?.title ?? "",
                main_image: product?.main_image ?? "",
                price: product?.list_price ?? 0,
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
                  name: product?.title ?? "",
                  main_image: product?.main_image ?? "",
                  price: product?.list_price ?? 0,
                } as any
              }
            />
          </div>
        </div>
      </div>

      {/* Extra details */}
      <div className="mt-6 bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        {product.condition && product.condition.length > 0 && (
          <div>
            <span className="font-semibold">Condition:</span>{" "}
            {product.condition.join(", ")}
          </div>
        )}
      </div>

      {/* Description */}
      {product.shortDesc && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700 text-sm">{product.shortDesc}</p>
        </div>
      )}
    </div>
  );
}
