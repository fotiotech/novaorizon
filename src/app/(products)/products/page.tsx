import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import Link from "next/link";
import Image from "next/image";

// Simple slugify for product names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

/**
 * Return the first positive, finite numeric candidate.
 * This makes `listPrice` reachable when `price` is 0.
 */
function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export default async function ProductsPage() {
  await connection();

  const products = await Product.find({})
    .select("_id name images price listPrice")
    .lean()
    .exec();

  // If no products, show a friendly message
  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-700">No products found</h1>
        <p className="text-gray-500 mt-2">Check back later for new arrivals.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-foreground">All Products</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product: any) => {
          const slug = slugify(product.name);
          const imageUrl =
            product.images && product.images.length > 0
              ? product.images[0]
              : "/placeholder.png";

          const displayPrice = pickPrice(product.price, product.listPrice);
          const numericListPrice = Number(product.listPrice) || 0;
          const showListPrice =
            numericListPrice > displayPrice && displayPrice > 0;

          return (
            <Link
              key={product._id}
              href={`/products/${slug}/${product._id}`}
              className="group block bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h2 className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                  {product.name}
                </h2>
                <div className="flex items-baseline gap-2 mt-1">
                  {displayPrice > 0 ? (
                    <p className="text-sm text-primary font-semibold">
                      {formatPrice(displayPrice)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Price on request
                    </p>
                  )}
                  {showListPrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(numericListPrice)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
