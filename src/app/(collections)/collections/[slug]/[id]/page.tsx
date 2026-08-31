import { connection } from "@/utils/connection";
import { Collection } from "@/models/Collection";
import {
  getModelForTargetType,
  buildQueryFromRules,
} from "@/lib/collection-helpers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get the route prefix for a given target type.
 * You can adjust these to match your actual routing.
 */
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

/**
 * Resolve items from a collection based on its targetType and type (manual/rule).
 */
async function resolveCollectionItems(collection: any) {
  const targetType = collection.targetType;
  const Model = getModelForTargetType(targetType);
  if (!Model) return [];

  let items: any[] = [];

  if (collection.type === "manual") {
    // Manual collection: items are stored as ObjectIds
    if (collection.items && collection.items.length > 0) {
      items = await (Model as any)
        .find({ _id: { $in: collection.items } })
        .lean();
    }
  } else {
    // Rule-based collection – only Product and Collection support rules
    if (["Product", "Collection"].includes(targetType)) {
      const query = buildQueryFromRules(collection.rules, targetType);
      if (Object.keys(query).length > 0) {
        items = await (Model as any).find(query).lean();
      }
    }
    // For other target types, rules are not allowed (the form prevents it),
    // so we return empty array.
  }

  // Normalize items: extract name and image
  return items.map((item: any) => ({
    _id: item._id.toString(),
    name: item.name || item.title || "Unnamed",
    image:
      item.main_image ||
      item.image ||
      item.imageUrl ||
      item.backgroundImage ||
      null,
    contentType: targetType,
  }));
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  await connection();

  const collection: any = await Collection.findById(id).lean();
  if (!collection) {
    notFound();
  }

  const items = await resolveCollectionItems(collection);

  const title = collection.name || "Collection";
  const description = collection.description || "";
  const imageUrl = collection.imageUrl || "/placeholder.png";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Collection header */}
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
          {/* Show target type for clarity */}
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
                  {/* Show content type badge for non‑Product items */}
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
