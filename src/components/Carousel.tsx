"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselItem = {
  _id: string;
  name: string;
  image: string | null;
  price: number | null;
  listPrice?: number | null;
  contentType: string; // "Product", "Collection", "Category", etc.
};

type CarouselProps = {
  items: CarouselItem[];
  showImages: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

/**
 * Return the first positive, finite numeric candidate.
 * Makes `listPrice` reachable when `price` is 0/missing.
 */
function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Build route based on contentType
const getItemHref = (item: CarouselItem) => {
  const slug = slugify(item.name);
  const prefix = item.contentType.toLowerCase() + "s"; // e.g., products, collections
  return `/${prefix}/${slug}/${item._id}`;
};

const Carousel = ({ items, showImages }: CarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Update button visibility on scroll
  const updateButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateButtons);
      requestAnimationFrame(updateButtons);
      return () => container.removeEventListener("scroll", updateButtons);
    }
  }, []);

  const scrollBy = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const slideWidth =
      container.querySelector(".carousel-slide")?.clientWidth || 200;
    const scrollAmount = slideWidth * (direction === "left" ? -1 : 1);
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="carousel-wrapper relative group">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-2 md:gap-4 py-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        suppressHydrationWarning
      >
        {items.map((item) => {
          const displayPrice = pickPrice(item.price, item.listPrice);
          const numericListPrice = Number(item.listPrice) || 0;
          const showListPrice =
            numericListPrice > displayPrice && displayPrice > 0;

          return (
            <div
              key={item._id}
              className="carousel-slide flex-shrink-0 snap-start w-[40%] sm:w-[45%] md:w-[30%] lg:w-[22%]"
            >
              {/* Whole card is a link */}
              <Link
                href={getItemHref(item)}
                className="group/card block bg-white rounded overflow-hidden hover:shadow-md transition-shadow"
                title={item.name}
              >
                {showImages && item.image && (
                  <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 40vw, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, 22vw"
                      className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="py-2 px-1">
                  <p className="line-clamp-2 text-sm">{item.name}</p>
                  {displayPrice > 0 && (
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-sm">
                        {formatPrice(displayPrice)}
                      </p>
                      {showListPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(numericListPrice)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {showLeft && (
        <button
          onClick={() => scrollBy("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md z-10 transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {showRight && (
        <button
          onClick={() => scrollBy("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md z-10 transition-opacity"
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
};

export default Carousel;
