// components/content/ShareButton.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/app/actions/events";

type ShareMethod =
  | "native"
  | "copy"
  | "whatsapp"
  | "facebook"
  | "telegram"
  | "email";

interface ShareButtonProps {
  title: string;
  productId?: string;
  /** Overrides window.location.href (useful during SSR or when the
   *  canonical link differs from the current URL). */
  url?: string;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ShareButton({
  title,
  productId,
  url,
  size = "sm",
  className = "",
  ariaLabel,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const resolveUrl = useCallback(
    () => url ?? (typeof window !== "undefined" ? window.location.href : ""),
    [url],
  );

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const track = useCallback(
    (method: ShareMethod) => {
      if (!productId) return;
      // Fire-and-forget. `trackEvent` is a server action; swallowing here
      // keeps the UI responsive even if tracking is unavailable (guest,
      // offline, bot UA — all handled server-side).
      trackEvent({
        itemId: productId,
        eventType: "share",
        metadata: { method },
      }).catch(() => {});
    },
    [productId],
  );

  const copy = useCallback(async () => {
    const href = resolveUrl();
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      track("copy");
      await sleep(1400);
      setCopied(false);
      setOpen(false);
    } catch {
      /* clipboard denied — leave menu open so the user can try another */
    }
  }, [resolveUrl, track]);

  const nativeShare = useCallback(async () => {
    const href = resolveUrl();
    if (!href) return;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as any).share({ title, url: href });
        track("native");
        setOpen(false);
      } catch (e: any) {
        // AbortError = user cancelled; anything else → open the fallback menu.
        if (e?.name !== "AbortError") setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, [title, resolveUrl, track]);

  const shareTo = useCallback(
    (network: Exclude<ShareMethod, "native" | "copy">) => {
      const href = resolveUrl();
      if (!href) return;
      const enc = encodeURIComponent;
      const targets: Record<typeof network, string> = {
        whatsapp: `https://wa.me/?text=${enc(`${title} ${href}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(href)}`,
        telegram: `https://t.me/share/url?url=${enc(href)}&text=${enc(title)}`,
        email: `mailto:?subject=${enc(title)}&body=${enc(href)}`,
      };
      window.open(targets[network], "_blank", "noopener,noreferrer");
      track(network);
      setOpen(false);
    },
    [title, resolveUrl, track],
  );

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const itemCls =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-popover-foreground hover:bg-muted focus:bg-muted focus:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={nativeShare}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? "Share"}
        title="Share"
        className={`inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 shadow-sm ring-1 ring-border/60 backdrop-blur transition hover:bg-background ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className={iconSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className={itemCls}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => shareTo("whatsapp")}
            className={itemCls}
          >
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => shareTo("facebook")}
            className={itemCls}
          >
            Facebook
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => shareTo("telegram")}
            className={itemCls}
          >
            Telegram
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => shareTo("email")}
            className={itemCls}
          >
            Email
          </button>
        </div>
      )}
    </div>
  );
}

export default ShareButton;
