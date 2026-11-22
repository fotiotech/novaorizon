import { apiData } from "@/lib/server-api";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return String(text || "")
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

interface ResolvedCollectionRow {
  collection: any;
  items: any[];
  itemCount: number;
  isDynamic: boolean;
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  let row: ResolvedCollectionRow | null = null;
  try {
    const rows = await apiData<ResolvedCollectionRow[]>("/catalog/collections", {
      query: { id, status: "active" },
    });
    const list = Array.isArray(rows) ? rows : [];
    row =
      list.find((r) => String(r?.collection?._id) === String(id)) ??
      list[0] ??
      null;
  } catch (error) {
    console.error("[collection page] failed to load collection:", error);
  }

  if (!row) {
    notFound();
  }

  const collection: any = row.collection;
  const items: any[] = Array.isArray(row.items) ? row.items : [];

  // Ensure the slug in the URL matches the collection name; redirect if not.
  const canonicalSlug = slugify(collection.name);
  if (slug !== canonicalSlug) {
    redirect(`/collections/${canonicalSlug}/${id}`);
  }

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
          {collection.ctaStyle &&
            collection.ctaStyle !== "none" &&
            collection.ctaLink && (
              <Link
                href={collection.ctaLink}
                className={
                  collection.ctaStyle === "button"
                    ? "mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                    : "mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                }
              >
                {collection.ctaText ||
                  (collection.ctaStyle === "button"
                    ? "Shop now"
                    : "View collection")}
              </Link>
            )}
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
                        {Number(item.price).toLocaleString("en-US")} F
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