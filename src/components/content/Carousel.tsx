// components/content/Carousel.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ContentCard } from "./ContentCard";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type {
  CardSize,
  CardVariant,
  CardShape,
  CardRatio,
  CardLayout,
  TitlePosition,
  ImagePosition,
} from "@/lib/content/constants";

export interface CardOverride {
  size?: CardSize;
  variant?: CardVariant;
  shape?: CardShape;
  ratio?: CardRatio;
  layout?: CardLayout;
  titlePosition?: TitlePosition;
  imagePosition?: ImagePosition;
  textColor?: string;
}

interface CarouselRailProps {
  items: NormalizedContentItem[];
  showImages: boolean;
  gap: number;
  cardOverride?: CardOverride;
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function CarouselRail({
  items,
  showImages,
  gap,
  cardOverride,
}: CarouselRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateButtons();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateButtons, items.length]);

  const scrollByAmount = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = 224;
    const amount = Math.max(cardWidth * 2, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (!items.length) return null;

  // Side-by-side cards need extra horizontal room so the text column
  // doesn't collapse. Stacked cards keep the default rail widths.
  const isSide =
    cardOverride?.layout === "image-left" ||
    cardOverride?.layout === "image-right";
  const slideWidthCls = isSide
    ? cardOverride?.size === "sm"
      ? "w-56 sm:w-64 md:w-72"
      : cardOverride?.size === "lg"
        ? "w-72 sm:w-80 md:w-96"
        : "w-64 sm:w-72 md:w-80"
    : cardOverride?.size === "sm"
      ? "w-32 sm:w-40 md:w-44"
      : cardOverride?.size === "lg"
        ? "w-48 sm:w-56 md:w-64"
        : "w-40 sm:w-48 md:w-56";

  // NOTE: buttons stay inside the rail's padding box.
  // The section that wraps this rail only has m-1 + p-2 on mobile (≈12px
  // of side buffer), so buttons using `-translate-x-1/2` would poke ~6px
  // past the viewport and trigger horizontal page scroll. Using `-left-2`
  // / `-right-2` keeps the "peek outside" look while staying in-bounds.
  const btnCls =
    "absolute top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition hover:bg-background hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

  return (
    <div className="group/rail relative">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className={`${btnCls} -left-2`}
        >
          <ChevronLeft />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        onScroll={updateButtons}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto pb-2"
        style={{ gap: `${gap}px` }}
      >
        {items.map((item) => (
          <div
            key={`${item.contentType}:${item._id}`}
            className={`${slideWidthCls} shrink-0 snap-start`}
          >
            <ContentCard
              item={item}
              showImage={showImages}
              size={cardOverride?.size}
              variant={cardOverride?.variant}
              shape={cardOverride?.shape}
              ratio={cardOverride?.ratio}
              layout={cardOverride?.layout}
              titlePosition={cardOverride?.titlePosition}
              imagePosition={cardOverride?.imagePosition}
              textColor={cardOverride?.textColor}
            />
          </div>
        ))}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className={`${btnCls} -right-2`}
        >
          <ChevronRight />
        </button>
      ) : null}
    </div>
  );
}

export default CarouselRail;
