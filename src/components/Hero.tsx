// components/Hero.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/constant/types";
import { findHeroContent } from "@/lib/api/hero-content";

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
        <div className="relative w-full aspect-[2/1] sm:aspect-[2/1] lg:aspect-[21/6] min-h-[120px] sm:min-h-[180px] lg:min-h-[220px] bg-neutral-900">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 animate-pulse" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center px-4 sm:px-6 lg:px-12">
            <div className="relative z-10 w-full max-w-[75%] sm:max-w-xl space-y-2 sm:space-y-3 text-left">
              <div className="h-5 sm:h-8 lg:h-10 w-3/4 rounded-md bg-white/10 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 sm:h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-3 sm:h-4 w-5/6 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="mt-2.5 h-9 sm:h-9 w-28 sm:w-32 rounded-full bg-white/10 animate-pulse" />
            </div>
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
                    Shorter full-bleed hero ratio, extra compact on mobile.
                    Mobile 2:1 · Tablet 2:1 · Desktop 21:6 (3.5:1)
                  */}
                  <div className="relative w-full aspect-[2/1] sm:aspect-[2/1] lg:aspect-[21/6] min-h-[120px] sm:min-h-[180px] lg:min-h-[220px]">
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      sizes="100vw"
                    />

                    {/* Uniform scrim (not a gradient) for text readability */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Text overlay — left-aligned on all screens */}
                    <div className="absolute inset-0 flex items-center px-4 sm:px-6 lg:px-12">
                      {/* Narrower text block on mobile, full width on sm+ */}
                      <div className="relative z-10 w-full max-w-[75%] sm:max-w-xl text-left">
                        <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight line-clamp-1 sm:line-clamp-2 drop-shadow-lg">
                          {title}
                        </h1>

                        {hero.description && (
                          <p className="mt-1 sm:mt-2 text-[11px] leading-snug sm:text-sm lg:text-base text-white/90 line-clamp-2 drop-shadow">
                            {hero.description}
                          </p>
                        )}

                        {hero.cta_text && (
                          <span className="mt-2.5 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-4 sm:px-6 py-2 sm:py-2 text-xs sm:text-sm lg:text-base font-semibold sm:font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                            {hero.cta_text}
                            <svg
                              className="h-3 w-3 sm:h-3.5 sm:w-3.5"
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
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-1.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-1 w-1 sm:h-2 sm:w-2 rounded-full transition-all duration-300 ${
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
