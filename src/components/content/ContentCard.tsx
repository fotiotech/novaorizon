// components/content/ContentCard.tsx
"use client";

import Link from "next/link";
import type { NormalizedContentItem } from "@/lib/content/resolve";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface ContentCardProps {
  item: NormalizedContentItem;
  showImage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "card" | "bare";
}

/* -------------------------------------------------------------------------- */
/*                              Price formatting                              */
/* -------------------------------------------------------------------------- */

/**
 * XAF currency. Matches the storefront-wide format used by
 * ProductDetailsClient (`${n} F`) so prices read identically everywhere.
 */
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
}: ContentCardProps) {
  const imgCls = size === "lg" ? "aspect-[4/3]" : "aspect-square";
  const paddingCls = size === "sm" ? "p-2" : "p-3";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  const cardCls =
    variant === "card"
      ? "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary hover:shadow-md"
      : "group flex h-full flex-col";

  const price = formatPrice(item.price);
  const listPrice = formatPrice(item.listPrice);
  const hasDiscount =
    price &&
    listPrice &&
    typeof item.price === "number" &&
    typeof item.listPrice === "number" &&
    item.price < item.listPrice;

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
