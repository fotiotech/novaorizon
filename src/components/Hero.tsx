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
      <div className="w-full h-60 md:h-72 lg:h-[400px] bg-muted flex items-center justify-center rounded-xl">
        <div className="text-muted-foreground">No hero content available</div>
      </div>
    );
  }

  return (
    <section
      aria-label="Hero carousel"
      className="relative h-60 md:h-72 lg:h-[400px] overflow-hidden mx-2 lg:mx-10 my-4 rounded-xl shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((hero: any, index) => {
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
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
                  <h1 className="max-w-4xl text-3xl md:text-5xl font-extrabold drop-shadow-lg line-clamp-3">
                    {title}
                  </h1>
                  {hero.subtitle && (
                    <p className="mt-2 text-base md:text-xl max-w-2xl text-white/90 drop-shadow">
                      {hero.subtitle}
                    </p>
                  )}
                  {hero.cta_text && (
                    <span className="mt-4 inline-block bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                      {hero.cta_text}
                    </span>
                  )}
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
                  ? "bg-primary scale-125 shadow-lg"
                  : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeaderScroll;
