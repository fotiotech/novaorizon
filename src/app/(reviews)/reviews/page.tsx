"use client";

import { useUserData } from "@/app/context/UserDataContext";
import ProductReviews from "@/components/product/reviews/ProductReviews";
import { useSearchParams } from "next/navigation";

export default function ProductReviewPage() {
  const { user, loading } = useUserData();
  const searchParams = useSearchParams();
  const productId = searchParams?.get("productId") || "";

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  // If no user, you might want to redirect or show a message
  if (!user) {
    return (
      <div className="text-center text-red-600">
        Please log in to leave a review.
      </div>
    );
  }

  // Ensure productId exists
  if (!productId) {
    return (
      <div className="text-center text-red-600">Product ID is required.</div>
    );
  }

  return (
    <div>
      <ProductReviews
        productId={productId}
        userId={user.id} // user.id from NextAuth session
      />
    </div>
  );
}
