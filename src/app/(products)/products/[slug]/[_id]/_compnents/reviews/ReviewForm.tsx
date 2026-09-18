import { addProductReview } from "@/app/actions/review";
import { useUserData } from "@/app/context/UserDataContext";
import { useState } from "react";

export default function ReviewForm({ productId }: { productId: string }) {
  const { user, loading } = useUserData();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  const submitReview = async () => {
    if (!productId) {
      setError("Product ID is missing.");
      return;
    }
    if (!userId) {
      setError("You must be logged in to submit a review.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }
    if (!reviewText.trim()) {
      setError("Please write a review.");
      return;
    }

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
      setRating(0);
      setReviewText("");
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="text-center text-destructive p-4 border border-border rounded-lg bg-background">
        Please log in to leave a review.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-background border border-border rounded-lg">
      <h2 className="text-lg font-semibold text-foreground">Write a Review</h2>
      {success && (
        <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
          Review submitted successfully!
        </div>
      )}
      {error && (
        <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}
      <input
        type="number"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        placeholder="Rating (1-5)"
        min={1}
        max={5}
        className="border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent"
        disabled={submitting}
      />
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your review"
        className="border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent"
        disabled={submitting}
        rows={4}
      />
      <button
        onClick={submitReview}
        className="btn bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
