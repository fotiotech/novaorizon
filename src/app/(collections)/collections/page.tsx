import { connection } from "@/utils/connection";
import { Collection } from "@/models/Collection";
import Link from "next/link";

// Simple slugify for collection names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function CollectionsPage() {
  await connection();

  const collections = await Collection.find({})
    .select("_id name description imageUrl")
    .sort({ order: 1, createdAt: -1 }) // sort by order then newest
    .lean()
    .exec();

  if (collections.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-700">
          No collections found
        </h1>
        <p className="text-gray-500 mt-2">
          Check back later for new collections.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Collections</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {collections.map((collection: any) => {
          const slug = slugify(collection.name);
          const imageUrl = collection.imageUrl || "/placeholder.png";

          return (
            <Link
              key={collection._id}
              href={`/collections/${slug}/${collection._id}`}
              className="group block bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={imageUrl}
                  alt={collection.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <h2 className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                  {collection.name}
                </h2>
                {collection.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {collection.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
