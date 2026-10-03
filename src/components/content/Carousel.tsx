// components/content/CarouselRail.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ContentCard } from "./ContentCard";
import type { NormalizedContentItem } from "@/lib/content/resolve";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface CarouselRailProps {
  items: NormalizedContentItem[];
  showImages: boolean;
  gap: number;
}

/* -------------------------------------------------------------------------- */
/*                                   Icons                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                 CarouselRail                               */
/* -------------------------------------------------------------------------- */

export function CarouselRail({ items, showImages, gap }: CarouselRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /* Recompute button visibility from the scroller's current position. */
  const updateButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  /* Sync on mount, on item changes, on resize. */
  useEffect(() => {
    updateButtons();
    const el = scrollerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateButtons, items.length]);

  /* Scroll by roughly a viewport of cards, so both buttons feel responsive
     at any container width. Minimum of one card + gap. */
  const scrollByAmount = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = 224; // matches md:w-56
    const amount = Math.max(cardWidth * 2, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (!items.length) return null;

  const btnCls =
    "absolute top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition hover:bg-background hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

  return (
    <div className="group/rail relative">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className={`${btnCls} left-0 -translate-x-1/2`}
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
            className="w-40 shrink-0 snap-start sm:w-48 md:w-56"
          >
            <ContentCard item={item} showImage={showImages} />
          </div>
        ))}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className={`${btnCls} right-0 translate-x-1/2`}
        >
          <ChevronRight />
        </button>
      ) : null}
    </div>
  );
}

export default CarouselRail;
