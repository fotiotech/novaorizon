// components/Hero.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/constant/types";

const MAX_SLIDES = 6;
const PLACEHOLDER_IMAGE = "/placeholder-hero.jpg";

/** Brand navy base. */
const OVERLAY_COLOR = "#07305e";

const HeaderScroll: React.FC<{ slides?: HeroSection[] }> = ({
  slides: initialSlides = [],
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = initialSlides.slice(0, MAX_SLIDES);

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
        className="relative overflow-hidden bg-black m-3 rounded-3xl"
      >
        <div
          className="relative w-full aspect-[2/1] sm:aspect-[2/1] lg:aspect-[21/6] min-h-[100px] sm:min-h-[180px] lg:min-h-[220px] flex"
          style={{ backgroundColor: OVERLAY_COLOR }}
        >
          <div className="relative w-1/2 sm:w-[55%] flex items-center px-3 sm:px-6 lg:px-12">
            <div className="relative z-10 w-full max-w-xl space-y-2 sm:space-y-3 text-left">
              <div className="h-6 sm:h-10 lg:h-12 w-3/4 rounded-md bg-white/10 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 sm:h-5 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-3 sm:h-5 w-5/6 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="mt-3 h-9 sm:h-11 w-28 sm:w-36 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="relative w-1/2 sm:w-[45%] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 animate-pulse" />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${OVERLAY_COLOR} 0%, transparent 100%)`,
              }}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Hero carousel"
      className="relative overflow-hidden bg-black m-3 rounded-3xl"
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
                    Text left · Image right (all screens).
                    Image uses object-contain so the full photo is visible;
                    the container's navy background fills any letterboxing.
                    Overlay = #07305e gradient (dark → transparent).
                    CTA uses accent (orange) for contrast against navy.
                  */}
                  <div
                    className="relative w-full aspect-[2/1] sm:aspect-[2/1] lg:aspect-[21/6] min-h-[120px] sm:min-h-[180px] lg:min-h-[220px] flex"
                    style={{ backgroundColor: OVERLAY_COLOR }}
                  >
                    {/* Text — left */}
                    <div className="relative z-10 flex w-1/2 sm:w-[55%] items-center px-3 sm:px-6 lg:px-12">
                      <div className="w-full max-w-xl text-left">
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight line-clamp-2 sm:line-clamp-2 drop-shadow-lg">
                          {title}
                        </h1>

                        {hero.description && (
                          <p className="mt-1.5 sm:mt-3 text-xs leading-snug sm:text-base lg:text-lg text-white/90 line-clamp-1 lg:line-clamp-2 drop-shadow">
                            {hero.description}
                          </p>
                        )}

                        {hero.cta_text && (
                          <span className="mt-2.5 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2.5 rounded-full bg-accent px-4 sm:px-7 py-2 sm:py-2.5 text-xs sm:text-base lg:text-lg font-semibold text-accent-foreground shadow-md transition-colors hover:bg-accent/90">
                            {hero.cta_text}
                            <svg
                              className="h-3 w-3 sm:h-4 sm:w-4"
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

                    {/* Image — right */}
                    <div
                      className="relative w-1/2 sm:w-[45%] overflow-hidden"
                      style={{ backgroundColor: OVERLAY_COLOR }}
                    >
                      <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-contain"
                        priority={index === 0}
                        sizes="(min-width: 640px) 45vw, 50vw"
                      />
                      {/* #07305e overlay: dark on left → light on right */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to right, #07305e 0%, rgba(7, 48, 94, 0) 100%)",
                        }}
                      />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation dots — horizontal row anchored bottom-right */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-5 right-3 sm:right-5 flex flex-row gap-2 sm:gap-3 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full transition-all duration-300 ${
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
