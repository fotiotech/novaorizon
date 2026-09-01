// components/RelatedProducts.tsx
"use client";

import { useEffect, useState } from "react";
import { getRelatedProducts } from "@/app/actions/events";
import Carousel from "../Carousel"; // your existing carousel

type RelatedProductsProps = {
  productId: string;
  limit?: number;
};

export default function RelatedProducts({
  productId,
  limit = 6,
}: RelatedProductsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRelatedProducts(productId, limit).then((res: any) => {
      if (res.success) {
        // Transform to the shape your Carousel expects
        const mapped = res.data.map((item: any) => ({
          _id: item._id,
          name: item.title || item.name,
          image: item.mainImage || item.main_image,
          price: item.salePrice ?? item.sale_price,
          contentType: "Product",
        }));
        setItems(mapped);
      }
      setLoading(false);
    });
  }, [productId, limit]);

  if (loading) return <div>Loading recommendations...</div>;
  if (items.length === 0) return null;

  return (
    <div className="related-products my-8">
      <h2 className="text-2xl font-bold mb-4">You may also like</h2>
      <Carousel items={items} showImages={true} />
    </div>
  );
}
