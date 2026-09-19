import { connection } from "@/utils/connection";
import { Collection } from "@/models/Collection";

import {
  getTrendingItems,
  getRecommendations,
  getRecentlyViewed,
  // getRelatedProducts, // uncomment once you want to resolve related here
} from "@/app/actions/events";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buildQueryFromRules,
  getModelForTargetType,
  normalizeItem,
} from "@/app/lib/collection/collection-helpers";

export const dynamic = "force-dynamic";

const ITEM_LIMIT = 50;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRoutePrefix(targetType: string): string {
  const map: Record<string, string> = {
    Product: "products",
    Category: "categories",
    Brand: "brands",
    Collection: "collections",
    Promotion: "promotions",
    Page: "pages",
  };
  return map[targetType] || "item";
}

async function resolveCollectionItems(
  collection: any,
  context?: { productId?: string },
) {
  const targetType = collection.targetType;

  // ---------- Recommendation ----------
  if (collection.type === "recommendation") {
    const limit = collection.recommendationLimit || 10;
    let raw: any[] = [];
    switch (collection.recommendationType) {
      case "trending":
        raw = await getTrendingItems(limit);
        break;
      case "personalized":
        raw = await getRecommendations(limit);
        break;
      case "recentlyViewed":
        raw = await getRecentlyViewed(limit);
        break;
      default:
        raw = [];
    }
    return raw.map((item) => normalizeItem(item, "Product"));
  }

  // ---------- Related ----------
  if (collection.type === "related") {
    // Requires a product context — this page has none.
    if (!context?.productId) return [];
    // If you want to resolve related here, import getRelatedProducts
    // and call it with context.productId.
    return [];
  }

  // ---------- Rule / Manual ----------
  const Model = getModelForTargetType(targetType);
  if (!Model) return [];

  let raw: any[] = [];

  if (collection.type === "manual") {
    if (collection.items?.length > 0) {
      raw = await (Model as any)
        .find({ _id: { $in: collection.items } })
        .limit(ITEM_LIMIT)
        .lean();
    }
  } else {
    // rule
    if (["Product", "Collection"].includes(targetType)) {
      const query = buildQueryFromRules(collection.rules, targetType);
      if (Object.keys(query).length > 0) {
        raw = await (Model as any).find(query).limit(ITEM_LIMIT).lean();
      }
    }
  }

  return raw.map((item) => normalizeItem(item, targetType));
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  await connection();

  const collection: any = await Collection.findOne({
    _id: id,
    status: "active",
  }).lean();

  if (!collection) {
    notFound();
  }

  // Ensure the slug in the URL matches the collection name; redirect if not.
  const canonicalSlug = slugify(collection.name);
  if (slug !== canonicalSlug) {
    redirect(`/collections/${canonicalSlug}/${id}`);
  }

  const items = await resolveCollectionItems(collection);

  const title = collection.name || "Collection";
  const description = collection.description || "";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-4">
        {collection.imageUrl && (
          <div className="relative w-full md:w-48 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={collection.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {description}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Type: {collection.targetType}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">This collection is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const itemSlug = slugify(item.name);
            const routePrefix = getRoutePrefix(item.contentType);
            const link = `/${routePrefix}/${itemSlug}/${item._id}`;

            const numericListPrice = Number(item.listPrice) || 0;
            const showListPrice =
              numericListPrice > 0 &&
              item.price != null &&
              numericListPrice > item.price;

            return (
              <Link
                key={item._id}
                href={link}
                className="group block bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={item.image || "/placeholder.png"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <h2 className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                    {item.name}
                  </h2>

                  {item.price != null && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="font-semibold text-sm">
                        {item.price.toLocaleString("en-US")} F
                      </p>
                      {showListPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {numericListPrice.toLocaleString("en-US")} F
                        </p>
                      )}
                    </div>
                  )}

                  {item.contentType !== "Product" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.contentType}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
