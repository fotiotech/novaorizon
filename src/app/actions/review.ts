"use server";

import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import { Review } from "@/models/Review";
import Product from "@/models/Product";

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
  await connection();

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const review = await Review.create({
    productId: new mongoose.Types.ObjectId(productId),
    userId: new mongoose.Types.ObjectId(userId),
    rating,
    reviewText: comment,
  });

  await Product.findByIdAndUpdate(
    productId,
    {
      $push: {
        reviewsRatings: {
          user: new mongoose.Types.ObjectId(userId),
          rating,
          comment,
        },
      },
    },
    { new: true },
  );

  const allReviews = await Review.find({ productId }).select("rating").lean();
  const average =
    allReviews.length > 0
      ? allReviews.reduce((sum, item) => sum + (item.rating || 0), 0) /
        allReviews.length
      : 0;

  await Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        rating: average,
        reviewCount: allReviews.length,
      },
    },
    { new: true },
  );

  return review.toObject();
}
