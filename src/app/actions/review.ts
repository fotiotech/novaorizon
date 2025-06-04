"use server";

import { Review } from "@/models/Review";
import Product from "@/models/Product";

import { connection } from "@/utils/connection";
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
  console.log(
    "→ [ServerAction] Before push, reviews_ratings:",
    product.reviews_ratings
  );

  // 3. Ensure `reviews_ratings` is an array
  if (!Array.isArray(product.reviews_ratings)) {
    product.reviews_ratings = [];
  }

  // 4. Push the new review
  product.reviews_ratings.push({
    user_id: userId,
    rating,
    comment,
    created_at: new Date(),
  });
  console.log(
    "→ [ServerAction] After push, reviews_ratings:",
    product.reviews_ratings
  );

  // 5. Ensure `ratings_summary` exists and preserve any existing attributes
  let existingAttrs: any[] = [];
  if (!product.ratings_summary) {
    product.ratings_summary = {
      average: 0,
      count: 0,
      attributes: [],
    };
  } else {
    existingAttrs = Array.isArray(product.ratings_summary.attributes)
      ? product.ratings_summary.attributes
      : [];
  }

  // 6. Recalculate `ratings_summary`
  const allRatings = product.reviews_ratings.map((r: any) => r.rating);
  const total = allRatings.reduce((sum: any, r: any) => sum + r, 0);
  const count = allRatings.length;
  product.ratings_summary = {
    average: count > 0 ? total / count : 0,
    count,
    attributes: existingAttrs,
  };

  console.log("→ [ServerAction] New ratings_summary:", product.ratings_summary);

  // 7. Save the updated product
  const saved = await product.save();
  console.log("→ [ServerAction] Saved product:", saved._id);
  console.log("→ [ServerAction] Saved reviews_ratings:", saved.reviews_ratings);

  // 8. Return the entire saved product document (or just ratings_summary)
  return saved.toObject();
}
