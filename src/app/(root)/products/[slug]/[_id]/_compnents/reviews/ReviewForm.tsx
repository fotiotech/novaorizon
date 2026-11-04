// app/(root)/products/[slug]/[_id]/_compnents/reviews/ReviewForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProductReview } from "@/app/actions/review";
import { useUserData } from "@/app/context/UserDataContext";

export default function ReviewForm({
  productId,
  onSuccess,
}: {
  productId: string;
  onSuccess?: () => void;
}) {
  const { user, loading } = useUserData();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  const submitReview = async () => {
    if (!productId) return setError("Product ID is missing.");
    if (!userId) return setError("You must be logged in to submit a review.");
    if (rating < 1 || rating > 5)
      return setError("Rating must be between 1 and 5.");
    if (!reviewText.trim()) return setError("Please write a review.");

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await addProductReview({
        productId,
        userId,
        rating,
        comment: reviewText,
      });
      setSuccess(true);
      setRating(5);
      setReviewText("");
      router.refresh(); // pulls the freshly-persisted review into `initialProduct`
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }

  if (!userId) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 text-center text-destructive">
        Please log in to leave a review.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {success && (
        <div className="rounded bg-green-50 p-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          Review submitted successfully!
        </div>
      )}
      {error && (
        <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <label
        htmlFor="review-rating"
        className="text-sm font-medium text-foreground"
      >
        Rating
      </label>
      <select
        id="review-rating"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        disabled={submitting}
        className="w-40 rounded border border-input bg-background p-2 text-foreground focus:border-transparent focus:ring-2 focus:ring-ring"
      >
        <option value={5}>5 – Excellent</option>
        <option value={4}>4 – Good</option>
        <option value={3}>3 – Fair</option>
        <option value={2}>2 – Poor</option>
        <option value={1}>1 – Terrible</option>
      </select>

      <label
        htmlFor="review-comment"
        className="text-sm font-medium text-foreground"
      >
        Comment
      </label>
      <textarea
        id="review-comment"
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your review"
        className="rounded border border-input bg-background p-2 text-foreground focus:border-transparent focus:ring-2 focus:ring-ring"
        disabled={submitting}
        rows={4}
      />

      <button
        onClick={submitReview}
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </div>
  );
}
