"use client";

import Hero from "@/components/Hero";
import ImageRenderer from "@/components/ImageRenderer";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Prices } from "@/components/cart/Prices";
import { triggerNotification } from "./actions/notifications";
import Head from "next/head";
import { useAppDispatch, useAppSelector } from "./hooks";
import { fetchUserEvents } from "@/fetch/fetchUser";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useSession } from "next-auth/react";
import Spinner from "@/components/Spinner";
import { getAllCollections } from "./actions/collection";

// Move interfaces to separate file if possible
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

interface Collection {
  _id: string;
  createdAt: string;
  description: string;
  display: string;
  name: string;
  imageUrl: string;
  status: string;
  updatedAt: string;
  __v: number;
  parent?: string;
  children?: Collection[];
}

// Memoized Product Card Component
const ProductCard = memo(
  ({
    product,
    onProductClick,
  }: {
    product: Product;
    onProductClick: () => void;
  }) => {
    const { _id, url_slug, title, shortDesc, list_price, main_image } = product;

    return (
      <Link
        href={`/${url_slug || "product"}/details/${_id}`}
        aria-label={`View ${title || "product"}`}
        prefetch={false}
      >
        <div
          onClick={onProductClick}
          className="flex flex-col gap-1 mb-1 rounded cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-white h-full"
        >
          <div className="w-full relative aspect-square bg-gray-100 rounded">
            {main_image ? (
              <ImageRenderer image={main_image} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
          </div>
          <h3 className="mt-2 w-full line-clamp-2 p-1 font-medium text-gray-800">
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
  }
);

ProductCard.displayName = "ProductCard";

// Memoized Collection Node Component
const CollectionNode = memo(
  ({ collection, level = 0 }: { collection: Collection; level?: number }) => {
    return (
      <div className="mb-4" style={{ marginLeft: `${level * 20}px` }}>
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">
            {collection.name}
            {level > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                (Child collection)
              </span>
            )}
          </h3>

          {collection?.imageUrl ? (
            <div className="w-full relative aspect-video mb-3">
              <ImageRenderer image={collection.imageUrl} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 mb-3">
              No Image
            </div>
          )}

          {collection.description && (
            <p className="text-gray-600">{collection.description}</p>
          )}
        </div>

        {/* Render child collections */}
        {collection.children && collection.children.length > 0 && (
          <div className="mt-2">
            {collection.children.map((child) => (
              <CollectionNode
                key={child._id}
                collection={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

CollectionNode.displayName = "CollectionNode";

export default function Home() {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productsState = useAppSelector((state) => state.product);
  const [collectionTree, setCollectionTree] = useState<Collection[]>([]);
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

  // Product click handler
  const handleProductClick = useCallback(() => {
    if (user?.id) {
      triggerNotification(user?.id, "A customer clicked on a product!");
    }
  }, [user]);

  // Load data effect
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingProducts(true);
        setLoadingCollections(true);

        // Fetch products and collections in parallel
        await Promise.all([
          dispatch(fetchProducts()),
          (async () => {
            try {
              const collectionsResponse = await getAllCollections();
              if (collectionsResponse.success) {
                setCollectionTree(collectionsResponse.data);
              } else {
                console.error(
                  "Failed to fetch collections:",
                  collectionsResponse.error
                );
              }
            } catch (error) {
              console.error("Error fetching collections:", error);
            }
          })(),
        ]);
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

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 300
    ) {
      setVisibleCount((prev) => prev + 8);
    }
  }, []);

  // Scroll effect
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Memoized product cards
  const productCards = useMemo(
    () =>
      visibleProducts
        .slice(0, 4)
        .map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onProductClick={handleProductClick}
          />
        )),
    [visibleProducts, handleProductClick]
  );

  // Memoized collection nodes
  const collectionNodes = useMemo(
    () =>
      collectionTree.map((collection) => (
        <CollectionNode key={collection._id} collection={collection} />
      )),
    [collectionTree]
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
        <section className="w-full bg-surface p-2 lg:px-10 lg:mt-1 mb-1 border-y border-gray-200">
          <h2 className="lg:mb-6 mb-4 font-bold text-2xl lg:text-3xl text-gray-800">
            New Arrivals
          </h2>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Spinner size={40} text="Loading products..." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto gap-2 lg:gap-6">
                {productCards}
              </div>

              {visibleCount < productsState.allIds.length && (
                <div className="flex justify-center mt-8">
                  <Spinner size={32} text="Loading more products..." />
                </div>
              )}
            </>
          )}
        </section>

        {/* Collections Section with Hierarchy */}
        {collectionTree.length > 0 && (
          <section className="w-full bg-white p-2 lg:px-10 lg:py-8 mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-center text-gray-800">
              Our Collections
            </h2>

            {loadingCollections ? (
              <div className="flex justify-center py-12">
                <Spinner size={40} text="Loading collections..." />
              </div>
            ) : (
              <div className="space-y-4">{collectionNodes}</div>
            )}
          </section>
        )}
      </main>
    </Layout>
  );
}
