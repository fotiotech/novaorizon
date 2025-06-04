"use client";

import { useUser } from "@/app/context/UserContext";
import ProductReviews from "@/components/product/reviews/ProductReviews";
import { useSearchParams } from "next/navigation";

export default function ProductReviewPage() {
  const { customerInfos } = useUser();
  const productId = useSearchParams().get("productId");

  return (
    <div>
      <ProductReviews
        productId={productId as string}
        userId={customerInfos?.userId as string}
      />
    </div>
  );
}
