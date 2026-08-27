// src/components/ExistingReviews.tsx
"use client";

import React from "react";

type Review = {
  _id: string;
  user_id: { _id: string; name: string };
  rating: number;
  comment: string;
  created_at: Date | string;
};

type ExistingReviewsProps = {
  reviews: Review[];
};

export default function ExistingReviews({ reviews }: ExistingReviewsProps) {
  if (!reviews || reviews?.length === 0) {
    return (
      <div className="bg-background rounded-lg p-6 border border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Customer Reviews
        </h2>
        <p className="text-muted-foreground">
          No reviews yet. Be the first to review!
        </p>
      </div>
    );
  }

  // Sort descending by date (newest first)
  const sorted = [...reviews].sort((a, b) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return db - da;
  });

  return (
    <div className="bg-background rounded-lg py-6 space-y-6 border-t border-border mt-4">
      <h2 className="text-2xl font-semibold text-foreground">
        Customer Reviews
      </h2>
      <ul className="space-y-6">
        {sorted?.map((review) => (
          <li
            key={review._id}
            className="border-b border-border pb-4 last:border-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">
                  {review.user_id.name}
                </span>
                <span className="text-muted-foreground text-sm ml-2">
                  {new Date(review.created_at).toLocaleDateString("fr-CM", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex items-center space-x-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const filled = i < review.rating;
                  return (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill={filled ? "currentColor" : "none"}
                      stroke="currentColor"
                      className={`w-5 h-5 ${
                        filled ? "text-yellow-400" : "text-muted-foreground/30"
                      }`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.946a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.945c.3.92-.755 1.688-1.54 1.118L10 13.348l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.945a1 1 0 00-.364-1.118L2.641 9.373c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.946z"
                        clipRule="evenodd"
                      />
                    </svg>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-foreground">{review.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
