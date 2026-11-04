// app/(root)/products/[slug]/[_id]/_compnents/reviews/ExistingReviews.tsx
"use client";

import React, { useMemo, useState } from "react";

type ReviewUser = { _id?: string; name?: string } | string | null | undefined;

export type Review = {
  _id?: string;
  user?: ReviewUser;
  user_id?: { _id?: string; name?: string };
  rating: number;
  comment?: string;
  createdAt?: Date | string;
  created_at?: Date | string;
};

type ExistingReviewsProps = {
  reviews?: Review[] | null;
  onWriteReview?: () => void;
};

const INITIAL_COUNT = 3;
const PAGE_STEP = 5;

// ---------- Star row ----------
const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 16,
}) => (
  <div
    className="flex items-center gap-0.5"
    aria-label={`${rating} out of 5 stars`}
  >
    {Array.from({ length: 5 }).map((_, i) => {
      const filled = i < Math.round(rating);
      return (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          className={filled ? "text-amber-400" : "text-muted-foreground/30"}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.946a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.945c.3.92-.755 1.688-1.54 1.118L10 13.348l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.945a1 1 0 00-.364-1.118L2.641 9.373c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.946z"
          />
        </svg>
      );
    })}
  </div>
);

// ---------- Shape helpers ----------
function getUser(review: Review): { id: string; name: string } {
  if (review.user_id && typeof review.user_id === "object") {
    return {
      id: String(review.user_id._id ?? ""),
      name: review.user_id.name || "Anonymous",
    };
  }
  if (review.user && typeof review.user === "object") {
    return {
      id: String(review.user._id ?? ""),
      name: review.user.name || "Anonymous",
    };
  }
  return { id: "", name: "Anonymous" };
}

function getDate(review: Review): Date | null {
  const raw = review.createdAt ?? review.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function ExistingReviews({
  reviews,
  onWriteReview,
}: ExistingReviewsProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const summary = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return {
      average: Math.round((total / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }, [reviews]);

  const sorted = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return [...reviews].sort((a, b) => {
      const da = getDate(a)?.getTime() ?? 0;
      const db = getDate(b)?.getTime() ?? 0;
      return db - da;
    });
  }, [reviews]);

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;

  // ---------- Empty state ----------
  if (!reviews || reviews.length === 0) {
    return (
      <section className="mt-8 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Customer reviews
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No reviews yet. Be the first to share your thoughts.
            </p>
          </div>
          {onWriteReview && (
            <button
              type="button"
              onClick={onWriteReview}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Write a review
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 bg-card">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Customer reviews
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {summary!.count} {summary!.count === 1 ? "review" : "reviews"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {summary && (
            <>
              <StarRating rating={summary.average} size={20} />
              <span className="text-2xl font-semibold text-foreground">
                {summary.average.toFixed(1)}
              </span>
            </>
          )}
          {onWriteReview && (
            <button
              type="button"
              onClick={onWriteReview}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Write a review
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-border">
        {visible.map((review, idx) => {
          const user = getUser(review);
          const date = getDate(review);
          return (
            <li
              key={review._id ?? `${user.id}-${idx}`}
              className="py-5 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {user.name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-foreground">
                      {user.name}
                    </span>
                    {date && (
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <StarRating rating={review.rating} size={14} />
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* See more / show less */}
      {remaining > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((c) => Math.min(c + PAGE_STEP, sorted.length))
            }
            className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See more reviews ({remaining})
          </button>
        </div>
      )}
      {visibleCount > INITIAL_COUNT && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount(INITIAL_COUNT)}
            className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Show less
          </button>
        </div>
      )}
    </section>
  );
}
