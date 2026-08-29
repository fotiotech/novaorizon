import Link from "next/link";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product._id}`}
      className="group block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="relative h-48 w-full bg-gray-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg truncate">{product.name}</h3>
        <p className="text-gray-600 font-bold mt-1">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
