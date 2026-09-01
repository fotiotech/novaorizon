import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import Link from "next/link";

// Simple slugify for product names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function ProductsPage() {
  await connection();

  const products = await Product.find({})
    .select(\"_id name mainImage price\")
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
          const imageUrl = product.mainImage || "/placeholder.png";

          return (
            <Link
              key={product._id}
              href={`/products/${slug}/${product._id}`}
              className="group block bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <h2 className="text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
                  {product.title}
                </h2>
                {product.price && (
                  <p className="text-sm text-primary font-semibold mt-1">
                    ${product.price.toFixed(2)}
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
