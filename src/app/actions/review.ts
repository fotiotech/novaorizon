// app/actions/review.ts
"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { requireUser } from "@/lib/authz";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function addProductReview(input: {
  productId: string;
  userId?: string;
  rating: number;
  comment?: string;
}) {
  const user = await requireUser();
  const userId = user.id;
  const limit = await consumeRateLimit(`review:${userId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    throw new Error("Too many reviews. Please try again later.");
  }
  const { productId, rating } = input;
  const comment = (input.comment ?? "").trim().slice(0, 1000);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product id.");
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
