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

  // Preload next image
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
      <div className="w-full h-60 md:h-72 lg:h-[400px] bg-muted flex items-center justify-center rounded-xl mx-2 lg:mx-10 my-2">
        <div className="text-muted-foreground"></div>
      </div>
    );
  }

  return (
    <section
      aria-label="Hero carousel"
      className="relative overflow-hidden bg-black"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides container */}
      <div className="relative">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((hero: any, index) => {
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
                    Layout:
                    - Mobile:  vertical (image on top, text below)
                    - Desktop: horizontal (text left, image right)
                  */}
                  <div className="relative grid grid-cols-1 lg:grid-cols-2 items-stretch min-h-[440px] lg:min-h-[460px]">
                    {/* Text panel */}
                    <div className="order-2 lg:order-1 relative flex items-center justify-center px-6 py-8 lg:px-12 lg:py-14 bg-black">
                      {/* Dark overlay for extra depth */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />

                      <div className="relative z-10 max-w-xl text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight line-clamp-3 drop-shadow-lg">
                          {title}
                        </h1>

                        {hero.description && (
                          <p className="mt-3 text-sm sm:text-base lg:text-lg text-white/80 line-clamp-3">
                            {hero.description}
                          </p>
                        )}

                        {hero.cta_text && (
                          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                            {hero.cta_text}
                            <svg
                              className="h-4 w-4"
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

                    {/* Image panel */}
                    <div className="order-1 lg:order-2 relative h-56 sm:h-72 lg:h-auto">
                      <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover"
                        priority={index === 0}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      {/* Dark overlay on the image */}
                      <div className="absolute inset-0 bg-black/40" />
                      {/* Mobile: fade image into the text panel below */}
                      <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/70 to-transparent" />
                      {/* Desktop: fade image into the text panel on the left */}
                      <div className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black via-black/70 to-transparent" />
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
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
