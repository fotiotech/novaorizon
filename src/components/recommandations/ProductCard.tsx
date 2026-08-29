// components/ProductCard.tsx
import Link from "next/link";
import Image from "next/image";

// Type that covers both your product schema and the simplified one
interface ProductCardProps {
  product: {
    _id: string;
    title?: string;
    name?: string; // fallback for other components
    main_image?: string;
    image?: string; // fallback
    sale_price?: number;
    list_price?: number;
    price?: number; // fallback
    // Additional fields are allowed but not used
  };
  className?: string;
}

export function ProductCard({ product, className = "" }: ProductCardProps) {
  // Normalize fields
  const id = product._id;
  const name = product.title || product.name || "Untitled Product";
  const image = product.main_image || product.image || "/placeholder.png";
  const price = product.sale_price ?? product.list_price ?? product.price ?? 0;

  return (
    <Link
      href={`/products/${name}/${id}`}
      className={`group block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="relative h-48 w-full aspect-square bg-gray-100">
        <Image
          src={image}
          alt={name}
          fill
          className="object-contain group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate">{name}</h3>
        <p className="text-gray-600 font-bold mt-1">{price} CFA</p>
      </div>
    </Link>
  );
}
