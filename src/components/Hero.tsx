// components/Hero.tsx
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
    [slides.length],
  );

  // Preload the next slide's image
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;

    const nextIndex = (currentIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];

    if (nextSlide?.imageUrl) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = nextSlide.imageUrl;
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [currentIndex, slides]);

  if (slides.length === 0) {
    return (
      <section
        aria-label="Hero carousel loading"
        className="relative overflow-hidden bg-black m-1 my-2 lg:mx-6 rounded-xl"
      >
        <div className="relative grid grid-cols-[45%_55%] sm:grid-cols-[2fr_3fr] lg:grid-cols-2 items-stretch min-h-[190px] sm:min-h-[300px] lg:min-h-[360px]">
          {/* Text panel skeleton — left */}
          <div className="relative flex items-center justify-center px-3 py-3 sm:px-6 lg:px-12 lg:py-10 bg-black">
            <div className="relative z-10 w-full max-w-xl space-y-3 sm:space-y-4 text-center lg:text-left">
              <div className="h-5 sm:h-9 lg:h-10 xl:h-12 w-3/4 mx-auto lg:mx-0 rounded-md bg-white/10 animate-pulse" />
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-3 sm:h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-3 sm:h-4 w-5/6 mx-auto lg:mx-0 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="mt-3 sm:mt-4 h-6 sm:h-9 w-20 sm:w-32 mx-auto lg:mx-0 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Image panel skeleton — right */}
          <div className="relative h-full bg-neutral-900">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 animate-pulse" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-y-0 left-0 w-[45%] sm:w-[55%] lg:w-[60%] bg-gradient-to-r from-black via-black/40 to-transparent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Hero carousel"
      className="relative overflow-hidden bg-black m-1 my-2 lg:mx-6 rounded-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((hero: HeroSection, index) => {
            const imageUrl = hero.imageUrl || PLACEHOLDER_IMAGE;
            const title = hero.title || "Novaorizon";
            const isActive = currentIndex === index;

            return (
              <div
                key={hero._id || index}
                className="relative flex-shrink-0 w-full"
                aria-hidden={!isActive}
              >
                <Link
                  href={hero.cta_link || "#"}
                  className="block"
                  tabIndex={isActive ? 0 : -1}
                >
                  {/*
                    Layout — image on the RIGHT, but wider than the text panel.
                    Mobile: 45/55 · Tablet: 40/60 · Desktop: 50/50
                    The image's left edge reaches further toward the text,
                    and the fade band (45% → 55% → 60%) spans further right.
                  */}
                  <div className="relative grid grid-cols-[45%_55%] sm:grid-cols-[2fr_3fr] lg:grid-cols-2 items-stretch min-h-[190px] sm:min-h-[300px] lg:min-h-[360px]">
                    {/* Text panel — LEFT */}
                    <div className="relative flex items-center justify-center px-3 py-3 sm:px-6 lg:px-12 lg:py-10 bg-black">
                      <div className="relative z-10 w-full max-w-xl text-center lg:text-left">
                        <h1 className="text-base sm:text-2xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight line-clamp-2 drop-shadow-lg">
                          {title}
                        </h1>

                        {hero.description && (
                          <p className="mt-1.5 text-xs leading-snug sm:mt-2 sm:text-sm lg:text-lg text-white/80 line-clamp-2 lg:line-clamp-3">
                            {hero.description}
                          </p>
                        )}

                        {hero.cta_text && (
                          <span className="mt-2 sm:mt-5 inline-flex items-center gap-1 sm:gap-2 rounded-full bg-primary px-2.5 sm:px-6 py-1 sm:py-2.5 text-xs sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                            {hero.cta_text}
                            <svg
                              className="h-2.5 w-2.5 sm:h-4 sm:w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image panel — RIGHT (wider) */}
                    <div className="relative h-full min-h-[190px] sm:min-h-[300px] lg:min-h-[360px]">
                      <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover"
                        priority={index === 0}
                        sizes="(max-width: 640px) 55vw, (max-width: 1024px) 60vw, 50vw"
                      />
                      {/* Base scrim */}
                      <div className="absolute inset-0 bg-black/40" />
                      {/*
                        Left-to-right fade — band widens as screens grow:
                        mobile 45% · tablet 55% · desktop 60%
                        This lets the overlay span further right into the
                        image while the image itself occupies more space.
                      */}
                      <div className="absolute inset-y-0 left-0 w-[45%] sm:w-[55%] lg:w-[60%] bg-gradient-to-r from-black via-black/40 to-transparent" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary scale-125 shadow-lg"
                  : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeaderScroll;
