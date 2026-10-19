// components/content/ContentCard.tsx
"use client";

import Link from "next/link";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type { CardShape } from "@/lib/content/constants";

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

/* -------------------------------------------------------------------------- */
/*                              Price formatting                              */
/* -------------------------------------------------------------------------- */

function formatPrice(amount: number | null | undefined): string | null {
  if (amount == null || typeof amount !== "number") return null;
  return `${amount.toLocaleString("en-US")} F`;
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

  /* ----------------------------- Circle mode ----------------------------- */
  if (shape === "circle") {
    const maxW =
      size === "sm"
        ? "max-w-[110px]"
        : size === "lg"
          ? "max-w-[200px]"
          : "max-w-[160px]";
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
              <span className="text-xs text-muted-foreground line-through">
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
  const paddingCls = size === "sm" ? "p-2" : "p-3";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  const cardCls =
    variant === "card"
      ? "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary hover:shadow-md"
      : "group flex h-full flex-col";

  return (
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

      <div className={`flex flex-1 flex-col ${paddingCls}`}>
        <p className={`line-clamp-2 font-semibold text-foreground ${textCls}`}>
          {item.name}
        </p>

        {item.description ? (
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
              <span className="text-xs text-muted-foreground line-through">
                {listPrice}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default ContentCard;
