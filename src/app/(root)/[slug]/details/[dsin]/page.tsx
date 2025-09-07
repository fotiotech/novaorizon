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

// Types
interface Params {
  slug: string;
  dsin: string;
}

export default function DetailsPage({ params }: { params: Params }) {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const product = useAppSelector((s) => s.product?.byId?.[params?.dsin]);
  const [loading, setLoading] = useState(!product);
  const [groups, setGroups] = useState<any[]>([]);

  // Load product only if not already in store
  useEffect(() => {
    if (!params?.dsin) return;

    if (!product) {
      setLoading(true);
      dispatch(fetchProducts(params.dsin)).finally(() => setLoading(false));
    }

    (async () => {
      try {
        const res = await findGroup();
        if (Array.isArray(res)) {
          setGroups(res);
        } else {
          console.warn("findGroup returned unexpected format", res);
          setGroups([]);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
        setGroups([]);
      }
    })();
  }, [dispatch, params?.dsin, product]);

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

  if (loading) {
    return <Loading loading={true} />;
  }

  if (!product) {
    return <div className="w-full p-8 text-center">Product not found</div>;
  }

  const renderGroup = (group: any, gCode?: string) => {
    if (!group || !group.code) return null;
    if (group.code === gCode) {
      return (
        <div key={group._id || group.code}>
          {group.name && <h3 className="font-semibold mb-2">{group.name}</h3>}
          <div>
            {group.attributes.length > 0 &&
              group.attributes?.map((a: any) => {
                if (!a?.code) return null;
                const { code, name } = a;
                const value = product?.[code];

                if (!value) return null;

                return (
                  <div key={code} className="grid grid-cols-2">
                    <span className="text-gray-300 font-bold">{name}:</span>
                    <span>
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                );
              })}
          </div>
          {Array.isArray(group.children) &&
            group.children.map((child: any) => renderGroup(child))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-gray-100 p-4">
      {/* Gallery & main info */}
      <div className="flex flex-col md:flex-row gap-6">
        {Array.isArray(product?.gallery) && product.gallery.length > 0 ? (
          <div>
            <DetailImages file={product.gallery} />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center bg-gray-200 text-gray-500 rounded p-6">
            No images available
          </div>
        )}

        <div className="text-text">
          <h1 className="mb-4">{product?.title || "Untitled Product"}</h1>

          {typeof product?.list_price === "number" && (
            <div className="text-2xl font-semibold mb-2">
              {product.list_price} cfa
            </div>
          )}

          {Array.isArray(product?.stock_status) &&
            product.stock_status.length > 0 && (
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
        {Array.isArray(product?.condition) && product.condition.length > 0 && (
          <div>
            <span className="font-semibold">Condition:</span>{" "}
            {product.condition.join(", ")}
          </div>
        )}
      </div>

      {/* Description */}
      {product?.short_desc && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <p className="text-gray-700 text-sm">{product.short_desc}</p>
        </div>
      )}

      <div>
        {groups.map((group: any) => renderGroup(group, "key_features"))}
        {groups.map((group: any) =>
          renderGroup(group, "product_specifications")
        )}
      </div>

      {product?.long_desc && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700 text-sm">{product.long_desc}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {product?.related_products?.map((p: any) => {
          const { _id, url_slug, title, main_image, list_price } = p;

          return (
            <Link
              key={_id}
              href={`/${url_slug || "product"}/details/${_id}`}
              className="flex flex-col gap-2"
            >
              <ImageRenderer image={main_image} />
              <h2>{title}</h2>
              <h2>{list_price}</h2>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
