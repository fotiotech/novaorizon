import { createReview } from "@/app/actions/review";
import { useUser } from "@/app/context/UserContext";
import { useState } from "react";

export default function ReviewForm({ productId }: { productId: string }) {
  const { user } = useUser();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const userId = user?._id as string;

  const submitReview = async () => {
    await createReview({
      productId,
      userId,
      rating,
      reviewText,
    });
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <h2 className="text-lg font-semibold">Write a Review</h2>
      <input
        type="number"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        placeholder="Rating (1-5)"
        min={1}
        max={5}
      />
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your review"
        className=""
      />
      <button onClick={submitReview} className="btn">
        Submit
      </button>
    </div>
  );
}
