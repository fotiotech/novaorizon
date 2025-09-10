"use client";

import Hero from "@/components/Hero";
import ImageRenderer from "@/components/ImageRenderer";
import Layout from "@/components/Layout";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Prices } from "@/components/cart/Prices";
import { triggerNotification } from "./actions/notifications";
import Head from "next/head";
import { useAppDispatch, useAppSelector } from "./hooks";
import { fetchUserEvents } from "@/fetch/fetchUser";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import Spinner from "@/components/Spinner";
import { getAllCollections } from "./actions/collection";
import { getCollectionsWithProducts } from "./actions/prodcollection";

// Move interfaces to separate file if possible, or keep here if necessary
interface Product {
  _id: string;
  url_slug?: string;
  title?: string;
  main_image?: string;
  shortDesc?: string;
  list_price?: number;
  category_id?: string;
  model?: string;
  sku?: string;
  gallery?: string[];
}

interface CollectionGroup {
  _id: string;
  ctaText: string;
  ctaUrl: string;
  description: string;
  imageUrl: string;
  name: string;
  position: number;
}

interface Collection {
  _id: string;
  createdAt: string;
  description: string;
  display: string;
  groups: CollectionGroup[];
  name: string;
  status: string;
  updatedAt: string;
  __v: number;
}

interface ProductCollection {
  collection: {
    _id: string;
    name: string;
    description: string;
    display: string;
    category: string;
    created_at: string;
    updated_at: string;
  };
  products: Product[];
  productCount: number;
}

export default function Home() {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productsState = useAppSelector((state) => state.product);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [productCollections, setProductCollections] = useState<
    ProductCollection[]
  >([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Memoized product data
  const visibleProducts = useMemo(
    () =>
      productsState.allIds
        .slice(0, visibleCount)
        .map((id) => productsState.byId[id]),
    [productsState.allIds, productsState.byId, visibleCount]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingProducts(true);
        setLoadingCollections(true);

        // Fetch products first
        await dispatch(fetchProducts());

        // Then fetch collections separately
        try {
          console.log("Fetching collections...");
          const collectionsResponse = await getAllCollections();
          console.log("Collections response:", collectionsResponse);

          if (collectionsResponse.success) {
            setCollections((collectionsResponse.data as any) || []);
          } else {
            console.error(
              "Failed to fetch collections:",
              collectionsResponse.error
            );
          }
        } catch (error) {
          console.error("Error fetching collections:", error);
        }

        // Then fetch product collections separately
        try {
          console.log("Fetching product collections...");
          const productCollectionsResponse = await getCollectionsWithProducts();
          console.log(
            "Product collections response:",
            productCollectionsResponse
          );

          if (productCollectionsResponse.success) {
            setProductCollections(
              (productCollectionsResponse.data as any) || []
            );
          } else {
            console.error(
              "Failed to fetch product collections:",
              productCollectionsResponse.error
            );
          }
        } catch (error) {
          console.error("Error fetching product collections:", error);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingProducts(false);
        setLoadingCollections(false);
      }
    };

    loadData();

    if (user?.id) {
      dispatch(fetchUserEvents(user?.id, "click", 10));
    }
  }, [dispatch, user]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 300
    ) {
      setVisibleCount((prev) => prev + 8);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Product click handler
  const handleProductClick = useCallback(() => {
    if (user?.id) {
      triggerNotification(user?.id, "A customer clicked on a product!");
    }
  }, [user]);

  // Render product card
  const renderProductCard = useCallback(
    (product: Product) => {
      const { _id, url_slug, title, shortDesc, list_price, main_image } =
        product;

      return (
        <Link
          href={`/${url_slug || "product"}/details/${_id}`}
          key={_id}
          aria-label={`View ${title || "product"}`}
        >
          <div
            onClick={handleProductClick}
            className="flex flex-col gap-1 mb-1 rounded cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-white p-3 h-full"
          >
            <div className="w-full relative  bg-gray-100 rounded">
              {main_image ? (
                <ImageRenderer image={main_image} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <h3 className="mt-2 w-full line-clamp-2 font-medium text-gray-800">
              {title || "No Title"}
            </h3>
            {shortDesc && (
              <p className="text-sm text-gray-500 line-clamp-2">{shortDesc}</p>
            )}
            {list_price !== undefined && (
              <div className="mt-1">
                <span className="font-bold text-gray-900">
                  <Prices amount={list_price} />
                </span>
              </div>
            )}
          </div>
        </Link>
      );
    },
    [handleProductClick]
  );

  // Render collection group
  const renderCollectionGroup = useCallback((group: CollectionGroup) => {
    return (
      <div
        key={group._id}
        className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-white"
      >
        <div className="w-full relative  bg-gray-100 rounded">
          {group?.imageUrl ? (
            <ImageRenderer image={group?.imageUrl} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Image
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            {group.name}
          </h3>
          {/* <p className="text-gray-600 text-sm mb-3">{group.description}</p>
          <Link
            href={group.ctaUrl}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            {group.ctaText}
          </Link> */}
        </div>
      </div>
    );
  }, []);

  // Render product collection
  const renderProductCollection = useCallback(
    (productCollection: ProductCollection) => {
      const { collection, products } = productCollection;

      return (
        <div key={collection._id} className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {collection.name}
            </h3>
            <Link
              href={`/collection/${collection._id}`}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              View All
            </Link>
          </div>
          {/* <p className="text-gray-600 mb-4">{collection.description}</p> */}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 4).map((product) => renderProductCard(product))}
          </div>
        </div>
      );
    },
    [renderProductCard]
  );

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

      <main className="bg-background">
        <Hero />
        {/* New Arrivals Section */}
        <section className="w-full bg-surface p-4 lg:px-10 lg:mt-1 mb-1 bg-blue-50 border-y border-gray-200">
          <h2 className="lg:mb-6 mb-4 font-bold text-2xl lg:text-3xl text-gray-800">
            New Arrivals
          </h2>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Spinner size={40} text="Loading products..." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto gap-4 lg:gap-6">
                {visibleProducts
                  .slice(0, 4)
                  ?.map((product) => renderProductCard(product))}
              </div>

              {visibleCount < productsState.allIds.length && (
                <div className="flex justify-center mt-8">
                  <Spinner size={32} text="Loading more products..." />
                </div>
              )}
            </>
          )}
        </section>

        {/* Product Collections Section */}
        {productCollections.length > 0 && (
          <section className="w-full bg-white p-4 lg:px-10 lg:py-8 mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-center text-gray-800">
              Shop by Collection
            </h2>

            {loadingCollections ? (
              <div className="flex justify-center py-12">
                <Spinner size={40} text="Loading collections..." />
              </div>
            ) : (
              <div className="space-y-8">
                {productCollections.map(renderProductCollection)}
              </div>
            )}
          </section>
        )}

        {/* Regular Collections Section */}
        {collections.length > 0 && (
          <section className="w-full bg-white p-4 lg:px-10 lg:py-8 mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-center text-gray-800">
              Featured Collections
            </h2>

            {loadingCollections ? (
              <div className="flex justify-center py-12">
                <Spinner size={40} text="Loading collections..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <div
                    key={collection._id}
                    className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100"
                  >
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">
                      {collection.name}
                    </h3>
                    {/* <p className="text-gray-600 mb-4">
                      {collection.description}
                    </p> */}

                    <div className="space-y-4">
                      {collection.groups?.map(renderCollectionGroup)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </Layout>
  );
}
