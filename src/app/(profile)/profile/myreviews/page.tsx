"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getCustomerReviews,
  deleteCustomerReview,
} from "@/app/actions/customer";
import Link from "next/link";
import Image from "next/image";
import Spinner from "@/components/Spinner";
import { Trash2, Star, ArrowLeft } from "lucide-react";

interface Review {
  _id: string;
  productId: { _id: string; name: string; mainImage?: string };
  rating: number;
  reviewText: string;
  helpfulCount: number;
  mediaUrl?: string[];
  createdAt: string;
}

export default function MyReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 8;
  const userId = (session?.user as any)?._id || (session?.user as any)?.id;

  useEffect(() => {
    if (!userId) return;

    async function fetchReviews() {
      setLoading(true);
      const result = await getCustomerReviews(userId, {
        page,
        limit,
      });
      if (result.success) {
        setReviews(result.reviews);
        setTotalPages(result.pages);
        setTotalReviews(result.total);
      }
      setLoading(false);
    }

    fetchReviews();
  }, [page, userId]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    setDeleting(reviewId);
    const result = await deleteCustomerReview(reviewId, userId);
    if (result.success) {
      setReviews(reviews.filter((r) => r._id !== reviewId));
    } else {
      alert(result.error || "Failed to delete review");
    }
    setDeleting(null);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/profile"
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Reviews
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You have posted {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Reviews Grid */}
      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't posted any reviews yet.
          </p>
          <Link
            href="/products"
            className="inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4 mb-4">
                {review.productId?.main_image && (
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={review.productId.main_image}
                      alt={review.productId.name}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                    {review.productId?.name}
                  </h3>
                  <div className="mt-2">{renderStars(review.rating)}</div>
                </div>
                <button
                  onClick={() => handleDelete(review._id)}
                  disabled={deleting === review._id}
                  className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                {review.reviewText}
              </p>

              {review.mediaUrl && review.mediaUrl.length > 0 && (
                <div className="mb-3 flex gap-2">
                  {review.mediaUrl.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Review media ${i + 1}`}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  👍 {review.helpfulCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded text-sm transition-colors ${
                  page === p
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
