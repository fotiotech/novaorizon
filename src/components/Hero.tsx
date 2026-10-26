"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Truck,
  Headset,
  Lock,
  RefreshCw,
  CreditCard,
  Clock,
  Award,
  Star,
  Phone,
  Package,
  BadgeCheck,
} from "lucide-react";
import { HeroSection, TrustBadge } from "@/constant/types";
import { findHeroContent } from "@/app/actions/content_management";

const MAX_SLIDES = 6;
const PLACEHOLDER_IMAGE = "/placeholder-hero.jpg";

// Maps the string identifiers stored in the DB to a real icon component.
// Falls back to ShieldCheck if an unknown icon name is encountered.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shield-check": ShieldCheck,
  truck: Truck,
  headset: Headset,
  lock: Lock,
  "refresh-cw": RefreshCw,
  "credit-card": CreditCard,
  clock: Clock,
  award: Award,
  star: Star,
  phone: Phone,
  package: Package,
  "badge-check": BadgeCheck,
};

const isExternal = (url: string) => /^https?:\/\//i.test(url);

interface TrustBadgesListProps {
  badges?: TrustBadge[];
  onBadgeActivate?: (badge: TrustBadge) => void;
}

const TrustBadgesList: React.FC<TrustBadgesListProps> = ({
  badges,
  onBadgeActivate,
}) => {
  if (!badges || badges.length === 0) return null;

  return (
    <ul
      aria-label="Trust badges"
      className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start"
    >
      {badges.map((badge, i) => {
        const Icon = ICON_MAP[badge.icon] ?? ShieldCheck;
        const isInteractive = !!(badge.popupText || badge.link);
        const hasPopup = !!badge.popupText;

        const inner = (
          <>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Icon className="h-4 w-4 text-white" />
            </span>
            <span className="text-left">
              <span className="block text-xs font-semibold text-white sm:text-sm">
                {badge.title}
              </span>
              {badge.description && (
                <span className="block text-[10px] text-white/60 sm:text-xs">
                  {badge.description}
                </span>
              )}
            </span>
          </>
        );

        if (isInteractive) {
          return (
            <li key={i}>
              <button
                type="button"
                onClick={(e) => {
                  // The badge sits inside the slide's <Link>. Stop the click
                  // from bubbling up and navigating away — we handle it here.
                  e.preventDefault();
                  e.stopPropagation();
                  onBadgeActivate?.(badge);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-haspopup={hasPopup ? "dialog" : undefined}
                aria-label={
                  hasPopup
                    ? `Show details for ${badge.title}`
                    : `Open ${badge.title}`
                }
              >
                {inner}
              </button>
            </li>
          );
        }

        return (
          <li key={i} className="flex items-center gap-2">
            {inner}
          </li>
        );
      })}
    </ul>
  );
};

const HeaderScroll: React.FC = () => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroContent, setHeroContent] = useState<HeroSection[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [activePopup, setActivePopup] = useState<TrustBadge | null>(null);

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
    // Pause the carousel while a popup is open so the slide doesn't change
    // out from under the user.
    if (slides.length <= 1 || isPaused || activePopup) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [slides.length, isPaused, activePopup]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentIndex(index % slides.length);
    },
    [slides.length],
  );

  // Close any open popup when the slide changes.
  useEffect(() => {
    setActivePopup(null);
  }, [currentIndex]);

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

  // Popup behavior: lock body scroll + close on Escape
  useEffect(() => {
    if (!activePopup) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePopup(null);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activePopup]);

  const handleBadgeActivate = useCallback(
    (badge: TrustBadge) => {
      if (badge.popupText) {
        setActivePopup(badge);
        return;
      }
      if (badge.link) {
        if (isExternal(badge.link)) {
          window.open(badge.link, "_blank", "noopener,noreferrer");
        } else {
          router.push(badge.link);
        }
      }
    },
    [router],
  );

  if (slides.length === 0) {
    return (
      <section
        aria-label="Hero carousel loading"
        className="relative overflow-hidden bg-black"
      >
        <div className="relative grid grid-cols-1 lg:grid-cols-2 items-stretch min-h-[440px] lg:min-h-[460px]">
          {/* Text panel skeleton */}
          <div className="order-2 lg:order-1 relative flex items-center justify-center px-6 py-8 lg:px-12 lg:py-14 bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />

            <div className="relative z-10 w-full max-w-xl space-y-4 text-center lg:text-left">
              <div className="h-7 sm:h-9 lg:h-10 xl:h-12 w-3/4 mx-auto lg:mx-0 rounded-md bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 sm:h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-3 sm:h-4 w-5/6 mx-auto lg:mx-0 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="mt-6 h-9 w-32 mx-auto lg:mx-0 rounded-full bg-white/10 animate-pulse" />
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <div className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
                <div className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
                <div className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Image panel skeleton */}
          <div className="order-1 lg:order-2 relative h-56 sm:h-72 lg:h-auto bg-neutral-900">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 animate-pulse" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black via-black/70 to-transparent" />
          </div>
        </div>
      </section>
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
                    Layout:
                    - Mobile:  vertical (image on top, text below)
                    - Desktop: horizontal (text left, image right)
                  */}
                  <div className="relative grid grid-cols-1 lg:grid-cols-2 items-stretch min-h-[440px] lg:min-h-[460px]">
                    {/* Text panel */}
                    <div className="order-2 lg:order-1 relative flex items-center justify-center px-6 py-8 lg:px-12 lg:py-14 bg-black">
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

                        {/* Trust badges — interactive */}
                        <TrustBadgesList
                          badges={hero.trustBadges}
                          onBadgeActivate={handleBadgeActivate}
                        />
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
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/70 to-transparent" />
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

      {/* Trust badge popup — bottom sheet on mobile, centered dialog on desktop */}
      {activePopup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          onClick={() => setActivePopup(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trust-badge-popup-title"
        >
          {/* Keyframes — scoped to this popup, vanish when it unmounts */}
          <style>{`
            @keyframes trustBadgeFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes trustBadgeSheetUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
            @keyframes trustBadgeDialogIn {
              from { opacity: 0; transform: scale(0.95); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 animate-[trustBadgeFadeIn_0.2s_ease-out]" />

          {/* Panel */}
          <div
            className="
              relative w-full sm:max-w-md bg-white shadow-2xl
              rounded-t-2xl sm:rounded-xl
              max-h-[85vh] sm:max-h-[80vh] overflow-y-auto
              animate-[trustBadgeSheetUp_0.3s_ease-out]
              sm:animate-[trustBadgeDialogIn_0.2s_ease-out]
            "
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* Drag handle — mobile only, signals "this is a sheet" */}
            <div className="sm:hidden flex justify-center pt-3">
              <div
                className="h-1.5 w-12 rounded-full bg-gray-300"
                aria-hidden="true"
              />
            </div>

            {/* Content */}
            <div className="p-6 pt-3 sm:pt-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3
                  id="trust-badge-popup-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {activePopup.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setActivePopup(null)}
                  className="p-2 -m-2 text-gray-400 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-line">
                {activePopup.popupText}
              </p>

              {activePopup.link && (
                <a
                  href={activePopup.link}
                  target={isExternal(activePopup.link) ? "_blank" : undefined}
                  rel={
                    isExternal(activePopup.link)
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Learn more
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
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeaderScroll;
