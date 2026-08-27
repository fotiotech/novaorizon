"use client";

import React, { useState } from "react";
import { addProductReview } from "@/app/actions/review";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  productId: string;
  userId: string; // Ensure userId can be null if not logged in
};

export default function ReviewForm({ productId, userId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await addProductReview({
        productId,
        userId,
        rating,
        comment: comment.trim(),
      });
      router.refresh();
      setComment("");
      setRating(5);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit review.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-background rounded-lg p-4 border border-border"
    >
      {error && <p className="text-destructive">{error}</p>}

      <div className="flex flex-col">
        <label htmlFor="rating" className="font-medium mb-1 text-foreground">
          Rating
        </label>
        <select
          id="rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="border border-input bg-background text-foreground p-2 rounded w-24 focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value={5}>5 – Excellent</option>
          <option value={4}>4 – Good</option>
          <option value={3}>3 – Fair</option>
          <option value={2}>2 – Poor</option>
          <option value={1}>1 – Terrible</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="comment" className="font-medium mb-1 text-foreground">
          Comment
        </label>
        <textarea
          id="comment"
          rows={4}
          className="border border-input bg-background text-foreground p-2 rounded w-full focus:ring-2 focus:ring-ring focus:border-transparent"
          placeholder="Write your review here…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        Submit Review
      </button>
    </form>
  );
}
