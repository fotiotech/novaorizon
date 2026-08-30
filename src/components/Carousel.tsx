"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselItem = {
  _id: string;
  name: string;
  image: string | null;
  price: number | null;
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
        {items.map((item) => (
          <div
            key={item._id}
            className="carousel-slide flex-shrink-0 snap-start w-[40%] sm:w-[45%] md:w-[30%] lg:w-[22%] p-1"
          >
            <div className="bg-white rounded shadow overflow-hidden">
              {showImages && item.image && (
                <div className="relative w-full aspect-square bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-2">
                <Link
                  href={getItemHref(item)}
                  className="block hover:underline"
                  title={item.name}
                >
                  <p className="line-clamp-2 text-sm">{item.name}</p>
                  <p className="font-semibold text-sm">{item.price} cfa</p>
                </Link>
              </div>
            </div>
          </div>
        ))}
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
