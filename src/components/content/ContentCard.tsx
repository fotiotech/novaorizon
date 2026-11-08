// components/content/ContentCard.tsx
"use client";

import Link from "next/link";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type { CardShape } from "@/lib/content/constants";
import { CardAddToCart } from "./CardAddToCart";
import { LikeButton } from "./LikeButton";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface ContentCardProps {
  item: NormalizedContentItem;
  showImage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "card" | "bare";
  shape?: CardShape;
}

interface RatingData {
  average: number;
  count: number;
}

/* -------------------------------------------------------------------------- */
/*                              Price formatting                              */
/* -------------------------------------------------------------------------- */

function formatPrice(amount: number | null | undefined): string | null {
  if (amount == null || typeof amount !== "number") return null;
  return `${amount.toLocaleString("en-US")} F`;
}

/* -------------------------------------------------------------------------- */
/*                              Rating helpers                                */
/* -------------------------------------------------------------------------- */

function getRating(item: NormalizedContentItem): RatingData | null {
  const anyItem = item as any;

  // Preferred path: precomputed by lib/content/resolve.ts
  if (typeof anyItem.averageRating === "number" && anyItem.averageRating > 0) {
    return {
      average: anyItem.averageRating,
      count: Math.max(0, Number(anyItem.reviewCount) || 0),
    };
  }

  // Fallback: derive from raw reviews if the normalizer passes them through.
  const reviews = anyItem.reviewsRatings;
  if (Array.isArray(reviews) && reviews.length > 0) {
    const sum = reviews.reduce(
      (s: number, r: any) => s + (Number(r?.rating) || 0),
      0,
    );
    return { average: sum / reviews.length, count: reviews.length };
  }

  return null;
}

function StarBase({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarItem({
  fill,
  className,
}: {
  fill: "full" | "half" | "empty";
  className?: string;
}) {
  if (fill === "half") {
    return (
      <span className={`relative inline-block ${className}`}>
        <StarBase className="absolute inset-0 h-full w-full text-muted-foreground/30" />
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: "50%" }}
        >
          <StarBase className="h-full w-full text-amber-500" />
        </span>
      </span>
    );
  }
  return (
    <StarBase
      className={`${className} ${
        fill === "full" ? "text-amber-500" : "text-muted-foreground/30"
      }`}
    />
  );
}

export function RatingRow({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count: number;
  size?: "sm" | "md";
}) {
  // Round to nearest 0.5 so we can render a half star cleanly.
  const rounded = Math.round(rating * 2) / 2;
  const starCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textCls = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div
      className="mt-1 flex items-center gap-1"
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} review${count === 1 ? "" : "s"}`}
    >
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill: "full" | "half" | "empty" =
            rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "empty";
          return <StarItem key={i} fill={fill} className={starCls} />;
        })}
      </div>
      <span className={`${textCls} text-muted-foreground`}>({count})</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 ContentCard                                */
/* -------------------------------------------------------------------------- */

export function ContentCard({
  item,
  showImage = true,
  size = "md",
  variant = "card",
  shape = "default",
}: ContentCardProps) {
  const price = formatPrice(item.price);
  const listPrice = formatPrice(item.listPrice);
  const hasDiscount =
    price &&
    listPrice &&
    typeof item.price === "number" &&
    typeof item.listPrice === "number" &&
    item.price < item.listPrice;

  const canBuy =
    item.contentType === "Product" && typeof item.price === "number";

  const rating = getRating(item);

  /* ----------------------------- Circle mode ----------------------------- */
  if (shape === "circle") {
    const maxW =
      size === "sm"
        ? "max-w-[110px]"
        : size === "lg"
          ? "max-w-[200px]"
          : "max-w-[100px]";
    const textCls =
      size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

    return (
      <Link
        href={item.href}
        className="group flex flex-col items-center gap-2 text-center"
      >
        {showImage && item.image ? (
          <div
            className={`relative mx-auto aspect-square w-full ${maxW} overflow-hidden rounded-full bg-muted ring-1 ring-border/60 transition group-hover:ring-2 group-hover:ring-primary/60 group-hover:shadow-md`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {item.badge ? (
              <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                {item.badge}
              </span>
            ) : null}
          </div>
        ) : null}

        <p
          className={`line-clamp-2 font-medium text-foreground transition group-hover:text-primary ${textCls}`}
        >
          {item.name}
        </p>

        {item.subline ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.subline}
          </p>
        ) : null}

        {price ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-foreground">{price}</span>
            {hasDiscount ? (
              <span className="hidden text-xs text-muted-foreground line-through sm:inline">
                {listPrice}
              </span>
            ) : null}
          </div>
        ) : null}
      </Link>
    );
  }

  /* ---------------------------- Default mode ----------------------------- */
  const imgCls = size === "lg" ? "aspect-[4/3]" : "aspect-square";
  const paddingCls = size === "sm" ? "py-2" : "py-3";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  const cardCls =
    variant === "card"
      ? "group flex h-full flex-col overflow-hidden rounded-xl bg-card transition"
      : "group flex h-full flex-col";

  const cardNode = (
    <Link href={item.href} className={cardCls}>
      {showImage && item.image ? (
        <div className={`relative w-full overflow-hidden bg-muted ${imgCls}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {item.badge ? (
            <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              {item.badge}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={`flex flex-1 flex-col ${paddingCls} ${
          canBuy && variant === "card" ? "pr-12" : ""
        }`}
      >
        <p
          className={`line-clamp-2 font-semibold text-muted-foreground ${textCls}`}
        >
          {item.name}
        </p>

        {/* Rating stars in the description slot; fall back to the description
            when the item has no reviews yet. */}
        {rating ? (
          <RatingRow
            rating={rating.average}
            count={rating.count}
            size={size === "lg" ? "md" : "sm"}
          />
        ) : item.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        ) : null}

        {item.subline ? (
          <p className="mt-1 text-xs text-muted-foreground">{item.subline}</p>
        ) : null}

        {price ? (
          <div className="mt-auto flex items-baseline gap-2 pt-2">
            <span className="text-sm font-bold text-foreground">{price}</span>
            {hasDiscount ? (
              <span className="hidden text-xs text-muted-foreground line-through sm:inline">
                {listPrice}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );

  const showLike = item.contentType === "Product";
  const showCart = canBuy && variant === "card";

  if (!showLike && !showCart) return cardNode;

  return (
    <div className="relative h-full">
      {cardNode}

      {showLike ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10">
          <div className="pointer-events-auto">
            <LikeButton itemId={item._id} size="sm" />
          </div>
        </div>
      ) : null}

      {showCart ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end p-2">
          <div className="pointer-events-auto">
            <CardAddToCart
              productId={item._id}
              name={item.name}
              image={item.image as any}
              price={item.price as number}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ContentCard;
