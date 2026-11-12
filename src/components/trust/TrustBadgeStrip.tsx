// components/trust/TrustBadgeStrip.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TrustBadgeIcon from "@/components/trust/TrustBadgeIcon";
import type { TrustBadgeDTO } from "@/app/actions/trust_badge";

const isExternal = (url: string) => /^https?:\/\//i.test(url);

interface TrustBadgeStripProps {
  badges: TrustBadgeDTO[];
}

const TrustBadgeStrip: React.FC<TrustBadgeStripProps> = ({ badges }) => {
  const router = useRouter();
  const [activePopup, setActivePopup] = useState<TrustBadgeDTO | null>(null);

  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Swipe detection — prevents a tap-to-navigate firing on a drag.
  const touchStartX = useRef(0);
  const didDrag = useRef(false);

  /* ---------------- scroll state ---------------- */
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    const raf = requestAnimationFrame(updateScrollState);
    const timer = setTimeout(updateScrollState, 150);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [badges, updateScrollState]);

  /* ---------------- popup: body lock + escape ---------------- */
  useEffect(() => {
    if (!activePopup) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePopup(null);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activePopup]);

  /* ---------------- activate a badge ---------------- */
  const handleBadgeActivate = useCallback(
    (badge: TrustBadgeDTO) => {
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

  if (!badges || badges.length === 0) return null;

  return (
    <div className="m-1 lg:mx-6">
      {/* Card container — bridges the white header and the black hero */}
      <div className="rounded-xl border border-border bg-card p-2 lg:p-3">
        <div className="relative">
          <ul
            ref={scrollRef}
            aria-label="Trust badges"
            className="flex w-full flex-nowrap items-center gap-x-5 overflow-x-auto py-1 sm:gap-x-6 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
            }}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              didDrag.current = false;
            }}
            onTouchMove={(e) => {
              if (Math.abs(e.touches[0].clientX - touchStartX.current) > 5) {
                didDrag.current = true;
              }
            }}
            onClickCapture={(e) => {
              if (didDrag.current) {
                e.preventDefault();
                e.stopPropagation();
                didDrag.current = false;
              }
            }}
          >
            {badges.map((badge) => {
              const key = badge._id;
              const isInteractive = !!(badge.popupText || badge.link);
              const hasPopup = !!badge.popupText;

              const inner = (
                <>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                    <TrustBadgeIcon
                      name={badge.icon}
                      className="h-4 w-4 text-foreground"
                    />
                  </span>
                  <span className="text-left">
                    <span className="block whitespace-nowrap text-xs font-semibold text-foreground sm:text-sm">
                      {badge.title}
                    </span>
                    {badge.description && (
                      <span className="block whitespace-nowrap text-[10px] text-muted-foreground sm:text-xs">
                        {badge.description}
                      </span>
                    )}
                  </span>
                </>
              );

              if (isInteractive) {
                return (
                  <li key={key} className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBadgeActivate(badge);
                      }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
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
                <li key={key} className="flex flex-shrink-0 items-center gap-2">
                  {inner}
                </li>
              );
            })}
          </ul>

          {/* Edge fades — inside the gutter, over the ul edges */}
          {canScrollLeft && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-8 bg-gradient-to-r from-card via-card/70 to-transparent"
            />
          )}
          {canScrollRight && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-8 bg-gradient-to-l from-card via-card/70 to-transparent"
            />
          )}
        </div>
      </div>

      {/* Badge popup — bottom sheet on mobile, centered dialog on desktop */}
      {activePopup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          onClick={() => setActivePopup(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trust-badge-popup-title"
        >
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

          <div className="absolute inset-0 bg-black/70 animate-[trustBadgeFadeIn_0.2s_ease-out]" />

          <div
            className="
              relative w-full sm:max-w-md bg-card text-card-foreground shadow-2xl
              rounded-t-2xl sm:rounded-xl
              max-h-[85vh] sm:max-h-[80vh] overflow-y-auto
              animate-[trustBadgeSheetUp_0.3s_ease-out]
              sm:animate-[trustBadgeDialogIn_0.2s_ease-out]
            "
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="sm:hidden flex justify-center pt-3">
              <div
                className="h-1.5 w-12 rounded-full bg-border"
                aria-hidden="true"
              />
            </div>

            <div className="p-6 pt-3 sm:pt-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3
                  id="trust-badge-popup-title"
                  className="text-lg font-bold text-foreground"
                >
                  {activePopup.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setActivePopup(null)}
                  className="p-2 -m-2 text-muted-foreground hover:text-foreground"
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

              <p className="text-sm text-foreground/80 whitespace-pre-line">
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
    </div>
  );
};

export default TrustBadgeStrip;
