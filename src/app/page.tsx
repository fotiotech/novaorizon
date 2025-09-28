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
import { getMenusByType } from "@/app/actions/menu";
import {
  fetchUserEvent,
  getRecommendations,
  createUserEvents,
} from "@/app/actions/user_events";

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

interface Menu {
  _id: string;
  name: string;
  description: string;
  collections: Collection[];
  ctaUrl: string;
  ctaText: string;
  createdAt: string;
  updatedAt: string;
}

interface Recommendation {
  product_id: string;
  category: string;
  brand: string;
  score: number;
  rank: number;
}

// Memoized Product Card Component
const ProductCard = memo(
  ({
    product,
    onProductClick,
    showRecommendationBadge = false,
  }: {
    product: Product;
    onProductClick: () => void;
    showRecommendationBadge?: boolean;
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
          className="flex flex-col gap-1 mb-1 rounded cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-white h-full relative"
        >
          {showRecommendationBadge && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full z-10">
              Recommended
            </div>
          )}
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

// Collection Card Component
const CollectionCard = memo(({ collection }: { collection: Collection }) => {
  return (
    <Link
      href={`/collection?id=${collection._id}`}
      className="block rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow h-full"
    >
      {collection.imageUrl && (
        <div className="w-full relative aspect-square mb-1 bg-gray-50">
          <ImageRenderer image={collection.imageUrl} />
        </div>
      )}
      <h4 className="text-lg p-2 font-semibold mb-1 text-gray-800">
        {collection.name}
      </h4>
    </Link>
  );
});

CollectionCard.displayName = "CollectionCard";

// Menu Section Component
const MenuSection = memo(({ menu }: { menu: Menu }) => {
  return (
    <section className="mb-1 ">
      <div className="rounded-lg mb-4">
        <h3 className="lg:mb-6 mb-4 font-bold text-2xl lg:text-3xl text-gray-800">
          {menu.name}
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menu.collections.map((collection) => (
          <CollectionCard key={collection._id} collection={collection} />
        ))}
      </div>
    </section>
  );
});

MenuSection.displayName = "MenuSection";

// Recommendation Section Component
const RecommendationSection = memo(
  ({
    recommendations,
    products,
    onProductClick,
  }: {
    recommendations: Recommendation[];
    products: Product[];
    onProductClick: (productId: string) => void;
  }) => {
    // Map recommendations to products
    const recommendedProducts = useMemo(() => {
      return recommendations
        .map((rec) => {
          const product = products.find((p) => p._id === rec.product_id);
          return product ? { ...product, recommendation: rec } : null;
        })
        .filter(Boolean) as (Product & { recommendation: Recommendation })[];
    }, [recommendations, products]);

    if (recommendedProducts.length === 0) return null;

    return (
      <section className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 p-2 lg:px-10 lg:py-8 mb-6 rounded-lg">
        <h2 className="lg:mb-6 mb-4 font-bold text-2xl lg:text-3xl text-gray-800">
          Recommended For You
        </h2>
        <p className="text-gray-600 mb-6">
          Products you might like based on your activity
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto gap-2 lg:gap-6">
          {recommendedProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onProductClick={() => onProductClick(product._id)}
              showRecommendationBadge={true}
            />
          ))}
        </div>
      </section>
    );
  }
);

RecommendationSection.displayName = "RecommendationSection";

export default function Home() {
  const dispatch = useAppDispatch();
  const session = useSession();
  const user = session?.data?.user as any;
  const productsState = useAppSelector((state) => state.product);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  // Memoized product data
  const visibleProducts = useMemo(
    () =>
      productsState.allIds
        .slice(0, visibleCount)
        .map((id) => productsState.byId[id]),
    [productsState.allIds, productsState.byId, visibleCount]
  );

  const handleProductClick = useCallback(
    async (productId: string) => {
      if (user?.id) {
        try {
          // Track the product view event
          await createUserEvents({
            userId: user.id,
            product_id: productId,
            event_type: "view",
            metadata: {
              page: "home",
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
            },
          });

          // Trigger notification
          triggerNotification(user.id, "A customer clicked on a product!");
        } catch (error) {
          console.error("Error tracking product click:", error);
        }
      }
    },
    [user]
  );

  // Load user recommendations
  const loadRecommendations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingRecommendations(true);
      const recs = await getRecommendations(user.id, 8);
      setRecommendations(recs);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [user]);

  // Load user history
  const loadUserHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const history = await fetchUserEvent(user.id, "view", 10);
      setUserHistory(history);
    } catch (error) {
      console.error("Error loading user history:", error);
    }
  }, [user]);

  // Load data effect
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingProducts(true);
        setLoadingMenus(true);

        // Fetch products and menus in parallel
        await Promise.all([
          dispatch(fetchProducts()),
          (async () => {
            try {
              const menusResponse = await getMenusByType("section");
              console.log({ menusResponse });
              if (menusResponse.success) {
                setMenus(menusResponse.data);
              } else {
                console.error("Failed to fetch menus:", menusResponse.error);
              }
            } catch (error) {
              console.error("Error fetching menus:", error);
            }
          })(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingProducts(false);
        setLoadingMenus(false);
      }
    };

    loadData();

    // Load user-specific data if user is logged in
    if (user?.id) {
      loadRecommendations();
      loadUserHistory();
      dispatch(fetchUserEvents(user.id, "click", 10));
    }
  }, [dispatch, user, loadRecommendations, loadUserHistory]);

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
            onProductClick={() => handleProductClick(product._id)}
          />
        )),
    [visibleProducts, handleProductClick]
  );

  // Memoized menu sections
  const menuSections = useMemo(
    () => menus.map((menu) => <MenuSection key={menu._id} menu={menu} />),
    [menus]
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

        {/* Personalized Recommendations Section */}
        {user?.id && (
          <RecommendationSection
            recommendations={recommendations}
            products={productsState.allIds.map((id) => productsState.byId[id])}
            onProductClick={handleProductClick}
          />
        )}

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

        {/* Menus with Collections Section */}
        {menus.length > 0 && (
          <section className="w-full bg-white p-2 lg:px-10 lg:py-8 mb-6">
            {loadingMenus ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-8">{menuSections}</div>
            )}
          </section>
        )}

        {/* Recently Viewed Section (for logged-in users) */}
        {user?.id && userHistory.length > 0 && (
          <section className="w-full bg-gray-50 p-2 lg:px-10 lg:py-8 mb-6 rounded-lg">
            <h2 className="lg:mb-6 mb-4 font-bold text-2xl lg:text-3xl text-gray-800">
              Recently Viewed
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto gap-2 lg:gap-6">
              {userHistory.slice(0, 4).map((event) => {
                const product = productsState.byId[event.product_id];
                if (!product) return null;

                return (
                  <ProductCard
                    key={event.id}
                    product={product}
                    onProductClick={() => handleProductClick(product._id)}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}
