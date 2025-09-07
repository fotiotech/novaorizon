"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/constant/types";
import { findHeroContent } from "@/app/actions/content_management";

const SLIDE_COUNT = 6;

const HeaderScroll: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [heroContent, setHeroContent] = useState<HeroSection[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Fetch hero content on mount
  useEffect(() => {
    async function getHeroContent() {
      const content = await findHeroContent();
      if (content) {
        setHeroContent(content);
      }
    }
    getHeroContent();
  }, []);

  // Auto-rotate interval (pauses if isPaused === true)
  useEffect(() => {
    if (heroContent.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroContent.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [heroContent.length, isPaused]);

  // Handler when a dot is clicked
  const dotIndex = (index: number) => {
    setCurrentImageIndex(index % heroContent.length);
  };

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full h-60 md:h-72 lg:h-screen overflow-hidden"
    >
      {/* Slide “Track” */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
      >
        {heroContent.slice(0, SLIDE_COUNT).map((hero, index) => (
          <div
            key={index}
            className="relative flex-shrink-0 w-full h-full"
            // aria-hidden={currentImageIndex !== index}
          >
            <Link href={hero.cta_link}>
              {/* Background Image + Overlay */}
              <div className="absolute inset-0">
                <Image
                  src={hero.imageUrl as string}
                  alt={hero.title || "Promotional Hero Image"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30"></div>
              </div>

              {/* Overlay Text / Content */}
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
                <h2 className="sr-only">
                  Slide {index + 1} of{" "}
                  {Math.min(heroContent.length, SLIDE_COUNT)}
                </h2>
                <h1 className="max-w-lg whitespace-normal text-2xl font-bold line-clamp-3">
                  {hero.title}
                </h1>
                {/* Optional sub‐heading or button could go here */}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Dots / Pagination */}
      <div className="absolute bottom-0 right-0 flex gap-4 p-4">
        {heroContent.slice(0, SLIDE_COUNT).map((_, idx) => (
          <button
            key={idx}
            onClick={() => dotIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              idx === currentImageIndex ? "bg-blue-600" : "bg-[#eee]"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeaderScroll;
