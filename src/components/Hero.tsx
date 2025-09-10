"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/constant/types";
import { findHeroContent } from "@/app/actions/content_management";

const MAX_SLIDES = 6;
const PLACEHOLDER_IMAGE = "/placeholder-hero.jpg";

const HeaderScroll: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroContent, setHeroContent] = useState<HeroSection[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const slides = heroContent.slice(0, MAX_SLIDES);

  // Memoized content fetcher
  const fetchHeroContent = useCallback(async () => {
    try {
      const content = await findHeroContent();
      setHeroContent(content || []);
    } catch (error) {
      console.error("Failed to fetch hero content:", error);
      setHeroContent([]);
    }
  }, []);

  useEffect(() => {
    fetchHeroContent();
  }, [fetchHeroContent]);

  // Auto-rotation with pause control
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentIndex(index % slides.length);
    },
    [slides.length]
  );

  // Preload images - Fixed implementation
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;

    // Preload next image for smoother transitions
    const nextIndex = (currentIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];

    if (nextSlide?.imageUrl) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = nextSlide.imageUrl;
      document.head.appendChild(link);

      // Clean up after preloading
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [currentIndex, slides]);

  if (slides.length === 0) {
    return (
      <div className="w-full h-60 md:h-72 lg:h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-gray-500">No hero content available</div>
      </div>
    );
  }

  return (
    <section
      aria-label="Hero carousel"
      className="relative w-full h-60 md:h-72 lg:h-screen overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((hero, index) => {
          const imageUrl = hero.imageUrl || PLACEHOLDER_IMAGE;
          const title = hero.title || "Novaorizon";

          return (
            <div
              key={hero._id || index}
              className="relative flex-shrink-0 w-full h-full"
              aria-hidden={currentIndex !== index}
            >
              <Link href={hero.cta_link || "#"} className="block h-full">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
                  <h1 className="max-w-4xl text-2xl md:text-4xl font-bold line-clamp-3">
                    {title}
                  </h1>
                  {/* {hero.subtitle && (
                    <p className="mt-2 text-lg md:text-xl max-w-2xl">
                      {hero.subtitle}
                    </p>
                  )} */}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Navigation dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-blue-600 scale-110"
                  : "bg-white/60 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeaderScroll;
