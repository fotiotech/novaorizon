"use client";

import Hero from "@/components/Hero";
import ImageRenderer from "@/components/ImageRenderer";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Prices } from "@/components/cart/Prices";
import { triggerNotification } from "./actions/notifications";
import Head from "next/head";
import { useAppDispatch, useAppSelector } from "./hooks";
import { fetchUserEvents } from "@/fetch/fetchUser";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import { getCollectionsWithProducts } from "./actions/products";
import Spinner from "@/components/Spinner";
import CategoryCard from "@/components/categoryCard";

export default function Home() {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productsState = useAppSelector((state) => state.product);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    dispatch(fetchProducts());

    const fetchCollections = async () => {
      try {
        const response = await getCollectionsWithProducts();
        if (!response.success) throw new Error("Failed to fetch collections");
        setCollections(response.data || []);
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    };
    fetchCollections();

    if (user?.id) {
      dispatch(fetchUserEvents(user?.id, "click", 10));
    }
  }, [dispatch, user]);

  const handleProductClick = () => {
    if (user?.id)
      triggerNotification(user?.id, "A customer clicked on a product!");
  };

  const renderProductCard = (product: any) => {
    const title = product.identification_branding?.name || "";
    const shortDesc = product.descriptions?.short || "";
    const mainImage =
      product.media_visuals?.main_image ||
      product.media_visuals?.gallery?.[0] ||
      null;
    const price = product.pricing_availability?.price;

    return (
      <Link
        href={`/${product.url_slug}/details/${product._id}`}
        key={product._id}
        aria-label="collection product"
      >
        <div
          onClick={handleProductClick}
          className="flex flex-col gap-1 mb-1 rounded cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="w-full h-full relative flex-shrink-0 bg-gray-100 rounded">
            {mainImage ? (
              <ImageRenderer image={mainImage} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
          </div>
          <h3 className="mt-2 w-full line-clamp-2 font-medium">{title}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">{shortDesc}</p>
          {price !== undefined && (
            <div className="mt-1">
              <span className="font-bold">
                <Prices amount={price} />
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  const renderCollectionSection = (col: any) => {
    if (col.collection.display === "carousel") {
      return (
        <section
          key={col.collection._id}
          className="w-full p-2 lg:px-10 lg:mt-6 mb-6 border-y border-gray-200"
        >
          <h2 className="lg:mb-4 mb-2 font-bold text-xl lg:text-2xl">
            {col.collection.name}
          </h2>
          <div className="flex overflow-x-auto gap-3 lg:gap-5">
            {col.products.map(renderProductCard)}
          </div>
        </section>
      );
    }

    if (col.collection.display === "category") {
      return (
        <div className="mb-5">
          {col.products.map((p: any) => (
            <CategoryCard
              name={p.category.categoryName}
              imageUrl={p.category.imageUrl}
              href={`/categories/${p.category._id}`}
            />
          ))}
        </div>
      );
    }

    return (
      <section
        key={col.collection._id}
        className="w-full p-2 lg:px-10 lg:mt-6 mb-6 border-y border-gray-200"
      >
        <h2 className="lg:mb-4 mb-2 font-bold text-xl lg:text-2xl">
          {col.collection.name}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {col.products.slice(0, 4).map(renderProductCard)}
        </div>
      </section>
    );
  };

  return (
    <Layout>
      <Head>
        <title>
          dyfkCameroun.com | Your One-Stop E-Commerce Store in Cameroun
        </title>
        <meta
          name="description"
          content="Discover the best deals on a wide range of products including electronics, fashion, home essentials, and more. Shop now at dyfkCameroun.com!"
        />
        <meta name="canonical" content="https://novaorizon.vercel.app" />
        <meta
          property="og:title"
          content="dyfkCameroun.com | Your One-Stop E-Commerce Store in Cameroun"
        />
        <meta
          property="og:description"
          content="Discover the best deals on a wide range of products including electronics, fashion, home essentials, and more. Shop now at dyfkCameroun.com!"
        />
        <meta property="og:url" content="https://novaorizon.vercel.app" />
        <meta
          property="og:image"
          content="https://novaorizon.vercel.app/logo.png"
        />
        <meta
          property="og:image:alt"
          content="dyfkCameroun.com - Your One-Stop E-Commerce Store in Cameroun"
        />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
      </Head>

      <main>
        <Hero />

        <section className="w-full p-2 lg:px-10 lg:mt-1 mb-1 bg-pri border-y">
          <h2 className="lg:mb-4 mb-2 font-bold text-xl lg:text-3xl">
            New Arrivals
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 mx-auto gap-3 lg:gap-5">
            {productsState.allIds.length > 0 ? (
              productsState.allIds
                .slice(0, 4)
                .map((id) => renderProductCard(productsState.byId[id]))
            ) : (
              <Spinner />
            )}
          </div>
        </section>

        {collections.map(renderCollectionSection)}
      </main>
    </Layout>
  );
}
