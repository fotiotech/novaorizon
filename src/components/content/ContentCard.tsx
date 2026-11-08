// components/content/ContentCard.tsx
"use client";

import Link from "next/link";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type {
  CardShape,
  CardRatio,
  CardSize,
  CardVariant,
  TitlePosition,
  ImagePosition,
} from "@/lib/content/constants";
import { CardAddToCart } from "./CardAddToCart";
import { LikeButton } from "./LikeButton";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface ContentCardProps {
  item: NormalizedContentItem;
  showImage?: boolean;
  size?: CardSize;
  variant?: CardVariant;
  shape?: CardShape;
  ratio?: CardRatio;
  titlePosition?: TitlePosition;
  imagePosition?: ImagePosition;
  /** Optional text color override — applied to title/description/price. */
  textColor?: string;
}

interface RatingData {
  average: number;
  count: number;
}

/* -------------------------------------------------------------------------- */
/*                              Class mappings                                */
/* -------------------------------------------------------------------------- */

const RATIO_CLS: Record<CardRatio, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
  "3:2": "aspect-[3/2]",
  "2:3": "aspect-[2/3]",
};

const IMG_POS_CLS: Record<ImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

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

  if (typeof anyItem.averageRating === "number" && anyItem.averageRating > 0) {
    return {
      average: anyItem.averageRating,
      count: Math.max(0, Number(anyItem.reviewCount) || 0),
    };
  }

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
  ratio = "1:1",
  titlePosition = "below",
  imagePosition = "center",
  textColor,
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
  const ratioCls = RATIO_CLS[ratio] ?? RATIO_CLS["1:1"];
  const imgPosCls = IMG_POS_CLS[imagePosition] ?? IMG_POS_CLS.center;
  const textStyle = textColor ? { color: textColor } : undefined;

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
              className={`h-full w-full object-cover ${imgPosCls} transition-transform duration-300 group-hover:scale-110`}
            />
            {item.badge ? (
              <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                {item.badge}
              </span>
            ) : null}
          </div>
        ) : null}

        {titlePosition !== "hidden" && (
          <p
            className={`line-clamp-2 font-medium text-foreground transition group-hover:text-primary ${textCls}`}
            style={textStyle}
          >
            {item.name}
          </p>
        )}

        {titlePosition !== "hidden" && item.subline ? (
          <p
            className="line-clamp-1 text-xs text-muted-foreground"
            style={textStyle}
          >
            {item.subline}
          </p>
        ) : null}

        {titlePosition !== "hidden" && price ? (
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-sm font-bold text-foreground"
              style={textStyle}
            >
              {price}
            </span>
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
  const paddingCls = size === "sm" ? "py-2" : "py-3";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  const cardCls =
    variant === "card"
      ? "group flex h-full flex-col overflow-hidden rounded-xl bg-card transition"
      : "group flex h-full flex-col";

  const isOverlay =
    titlePosition === "overlay-top" || titlePosition === "overlay-bottom";
  const isHidden = titlePosition === "hidden";
  const showTextBlock = !isOverlay && !isHidden;

  const overlayGradient =
    titlePosition === "overlay-top"
      ? "top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      : "bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent";

  const cardNode = (
    <Link href={item.href} className={cardCls}>
      {showImage && item.image ? (
        <div className={`relative w-full overflow-hidden bg-muted ${ratioCls}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className={`h-full w-full object-cover ${imgPosCls} transition-transform duration-300 group-hover:scale-105`}
          />
          {item.badge ? (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              {item.badge}
            </span>
          ) : null}

          {isOverlay && (
            <div className={`absolute inset-x-0 ${overlayGradient} p-3`}>
              <p
                className="line-clamp-2 text-sm font-semibold text-white drop-shadow"
                style={textColor ? { color: textColor } : undefined}
              >
                {item.name}
              </p>
              {item.subline ? (
                <p className="line-clamp-1 text-[11px] text-white/80">
                  {item.subline}
                </p>
              ) : null}
              {price ? (
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-white">{price}</span>
                  {hasDiscount ? (
                    <span className="text-[11px] text-white/70 line-through">
                      {listPrice}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {showTextBlock ? (
        <div
          className={`flex flex-1 flex-col ${paddingCls} ${
            canBuy && variant === "card" ? "pr-12" : ""
          }`}
        >
          <p
            className={`line-clamp-2 font-semibold text-muted-foreground ${textCls}`}
            style={textStyle}
          >
            {item.name}
          </p>

          {rating ? (
            <RatingRow
              rating={rating.average}
              count={rating.count}
              size={size === "lg" ? "md" : "sm"}
            />
          ) : item.description ? (
            <p
              className="mt-1 line-clamp-2 text-xs text-muted-foreground"
              style={textStyle}
            >
              {item.description}
            </p>
          ) : null}

          {item.subline ? (
            <p className="mt-1 text-xs text-muted-foreground" style={textStyle}>
              {item.subline}
            </p>
          ) : null}

          {price ? (
            <div className="mt-auto flex items-baseline gap-2 pt-2">
              <span
                className="text-sm font-bold text-foreground"
                style={textStyle}
              >
                {price}
              </span>
              {hasDiscount ? (
                <span className="hidden text-xs text-muted-foreground line-through sm:inline">
                  {listPrice}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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
