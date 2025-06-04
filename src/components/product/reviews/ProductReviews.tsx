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
      // Call the server action directly
      await addProductReview({ productId, userId, rating, comment: comment.trim() });

      // Optionally, revalidate the page or redirect so the new review appears.
      // For example, if this page’s path is `/product/[id]`:
      router.refresh();
      setComment("");
      setRating(5);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit review.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
      {error && <p className="text-red-500">{error}</p>}

      <div className="flex flex-col">
        <label htmlFor="rating" className="font-medium mb-1">Rating</label>
        <select
          id="rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="border p-2 rounded w-24"
        >
          <option value={5}>5 – Excellent</option>
          <option value={4}>4 – Good</option>
          <option value={3}>3 – Fair</option>
          <option value={2}>2 – Poor</option>
          <option value={1}>1 – Terrible</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="comment" className="font-medium mb-1">Comment</label>
        <textarea
          id="comment"
          rows={4}
          className="border p-2 rounded w-full"
          placeholder="Write your review here…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
      >
        Submit Review
      </button>
    </form>
  );
}
