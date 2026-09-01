"use server";

import { connection } from "@/utils/connection";
import { redirect } from "next/navigation";

// ---------- Get customer profile by user ID ----------
export async function getCustomerProfile(userId: string) {
  try {
    await connection();
    // Note: Customer profile is managed in the User model
    // This is a placeholder for customer profile fetching
    return { success: true, customer: null };
  } catch (error: any) {
    console.error("Error fetching customer profile:", error);
    return { success: false, error: error.message };
  }
}

// ---------- Get customer reviews ----------
export async function getCustomerReviews(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
  },
) {
  try {
    await connection();
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const Review = (global as any).mongoose?.models?.Review;
    if (!Review) {
      return { success: true, reviews: [], total: 0, pages: 0 };
    }

    const total = await Review.countDocuments({ userId });
    const reviews = await Review.find({ userId })
      .populate("productId", "name mainImage")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      reviews: reviews.map((r: any) => ({
        ...r,
        _id: r._id.toString(),
        userId: r.userId?.toString(),
        productId: r.productId?._id?.toString(),
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: any) {
    console.error("Error fetching customer reviews:", error);
    return {
      success: false,
      error: error.message,
      reviews: [],
      total: 0,
      pages: 0,
    };
  }
}

// ---------- Delete customer review ----------
export async function deleteCustomerReview(reviewId: string, userId: string) {
  try {
    await connection();
    const Review = (global as any).mongoose?.models?.Review;
    if (!Review) {
      return { success: false, error: "Review model not found" };
    }

    // Verify the review belongs to the user
    const review = await Review.findById(reviewId);
    if (!review) {
      return { success: false, error: "Review not found" };
    }

    if (review.userId.toString() !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await Review.findByIdAndDelete(reviewId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return { success: false, error: error.message };
  }
}
