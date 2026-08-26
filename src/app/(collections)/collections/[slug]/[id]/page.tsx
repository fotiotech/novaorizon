import { connection } from "@/utils/connection";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildQueryFromRules } from "@/app/actions/collection";

// Simple slugify for names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Resolve items from a collection (manual or rule-based)
async function resolveCollectionItems(collection: any) {
  const targetModel =
    collection.targetType === "Product" ? Product : Collection;
  let items: any[] = [];

  if (collection.type === "manual") {
    // Manual: fetch the stored item IDs
    if (collection.items && collection.items.length > 0) {
      items = await targetModel
        .find({ _id: { $in: collection.items } })
        .lean()
        .exec();
    }
  } else {
    // Rule-based: build query and fetch
    if (collection.rules && collection.rules.length > 0) {
      const query = buildQueryFromRules(
        collection.rules,
        collection.targetType,
      );
      if (Object.keys(query).length > 0) {
        items = await targetModel.find(query).lean().exec();
      }
    }
  }

  // Normalize items: each should have _id, name, image, and contentType
  return items.map((item: any) => ({
    _id: item._id.toString(),
    name: item.name || item.title || "Unnamed",
    image: item.main_image || item.image || item.imageUrl || null,
    contentType: collection.targetType, // "Product" or "Collection"
  }));
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  await connection();

  const collection: any = await Collection.findById(params.id).lean().exec();

  if (!collection) {
    notFound();
  }

  // Resolve items
  const items = await resolveCollectionItems(collection);

  // Build the title and description for the page
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
        </div>
      </div>

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">This collection is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const slug = slugify(item.name);
            const link =
              item.contentType === "Product"
                ? `/${slug}/details/${item._id}`
                : `/collections/${slug}/${item._id}`;

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
                  {item.contentType === "Collection" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Collection
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
