"use server";

import { connection } from "@/utils/connection";
import { Review } from "@/models/Review";
import Product from "@/models/Product";
import { revalidatePath } from "next/cache";

// app/actions/reviewActions.ts
type AddReviewParams = {
  productId: string;
  userId: string;
  rating: number;
  comment: string;
};

export async function addProductReview({
  productId,
  userId,
  rating,
  comment,
}: AddReviewParams) {
  // 1. Connect to MongoDB
  await connection();

  // 2. Fetch the product
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }
  console.log("→ [ServerAction] Found product:", productId);
  console.log("→ [ServerAction] Before push, reviews:", product.reviews);

  // 3. Ensure `reviews` is an array
  if (!Array.isArray(product.reviews)) {
    product.reviews = [];
  }

  // 4. Push the new review
  product.reviews.push({
    user_id: userId,
    rating, // Store rating in the review object
    comment,
    created_at: new Date(),
  });

  console.log("→ [ServerAction] After push, reviews:", product.reviews);

  // 5. Ensure `ratings_summary` exists
  if (!product.ratings_summary) {
    product.ratings_summary = {
      average: 0,
      count: 0,
    };
  }

  // 6. Recalculate `ratings_summary` from all reviews
  const allRatings = product.reviews.map((r: any) => r.rating);
  const total = allRatings.reduce((sum: number, r: number) => sum + r, 0);
  const count = allRatings.length;
  const average = count > 0 ? total / count : 0;

  product.ratings_summary = {
    average,
    count,
  };

  // 7. Update root rating field (optional - you can remove if you only want ratings_summary)
  product.rating = average;

  console.log("→ [ServerAction] New ratings_summary:", product.ratings_summary);

  // 8. Save the updated product
  const saved = await product.save();
  console.log("→ [ServerAction] Saved product:", saved._id);
  console.log("→ [ServerAction] Saved reviews:", saved.reviews);

  // 9. Return the entire saved product document
  return saved.toObject();
}
