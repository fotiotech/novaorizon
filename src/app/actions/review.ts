// app/actions/review.ts
"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";

export async function addProductReview(input: {
  productId: string;
  userId: string;
  rating: number;
  comment?: string;
}) {
  const { productId, userId, rating } = input;
  const comment = (input.comment ?? "").trim().slice(0, 1000);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product id.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("You must be logged in to submit a review.");
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  await connection();

  const product: any = await Product.findById(productId);
  if (!product) throw new Error("Product not found.");

  // One review per user — edit instead of duplicating.
  const existing = product.reviewsRatings.find(
    (r: any) => String(r.user) === String(userId),
  );

  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.updatedAt = new Date();
  } else {
    product.reviewsRatings.push({
      user: new mongoose.Types.ObjectId(userId),
      rating,
      comment,
    });
  }

  await product.save();

  // Refresh both the product page and the (optional) catalogue.
  if (product.slug) {
    revalidatePath(`/products/${product.slug}/${productId}`);
  }
  revalidatePath("/products");

  return { success: true };
}
