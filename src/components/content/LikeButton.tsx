// components/content/LikeButton.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLikeStates,
  toggleLike,
  type LikeState,
} from "@/app/actions/events";

/* -------------------------------------------------------------------------- */
/*                          Batched initial-state fetch                       */
/* -------------------------------------------------------------------------- */

/**
 * A grid mounts ~N LikeButtons at once. Coalesce their initial lookups into
 * a single server action so we don't fire N round-trips. Results are cached
 * for the lifetime of the client session — a product rendered in a grid and
 * again in a carousel only fetches once.
 */
const cache = new Map<string, LikeState>();
const pendingIds = new Set<string>();
const waiters = new Map<string, Array<(s: LikeState) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function loadState(itemId: string): Promise<LikeState> {
  const cached = cache.get(itemId);
  if (cached) return Promise.resolve(cached);

  return new Promise<LikeState>((resolve) => {
    pendingIds.add(itemId);
    const list = waiters.get(itemId) ?? [];
    list.push(resolve);
    waiters.set(itemId, list);

    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const ids = Array.from(pendingIds);
      pendingIds.clear();
      const handlers = new Map(waiters);
      waiters.clear();

      try {
        const res = await getLikeStates(ids);
        for (const id of ids) {
          const state = res[id] ?? { liked: false, count: 0 };
          cache.set(id, state);
          (handlers.get(id) ?? []).forEach((cb) => cb(state));
        }
      } catch {
        for (const id of ids) {
          (handlers.get(id) ?? []).forEach((cb) =>
            cb({ liked: false, count: 0 }),
          );
        }
      }
    }, 20);
  });
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

interface LikeButtonProps {
  itemId: string;
  size?: "sm" | "md";
  showCount?: boolean;
  initialLiked?: boolean;
  initialCount?: number;
  className?: string;
  ariaLabel?: string;
}

export function LikeButton({
  itemId,
  size = "sm",
  showCount = true,
  initialLiked,
  initialCount,
  className = "",
  ariaLabel,
}: LikeButtonProps) {
  const [liked, setLiked] = useState<boolean>(initialLiked ?? false);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [ready, setReady] = useState<boolean>(
    initialLiked !== undefined && initialCount !== undefined,
  );
  const [pulse, setPulse] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadState(itemId)
      .then((s) => {
        if (cancelled) return;
        setLiked(s.liked);
        setCount(s.count);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, ready]);

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      // The button sits inside a <Link>; keep it from navigating.
      e.preventDefault();
      e.stopPropagation();

      if (busy.current || !ready) return;
      busy.current = true;

      const prev = { liked, count };
      const next: LikeState = {
        liked: !liked,
        count: Math.max(0, count + (liked ? -1 : 1)),
      };
      setLiked(next.liked);
      setCount(next.count);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 280);

      try {
        const res = await toggleLike(itemId);
        if (!res) {
          // Guest → server refused; revert.
          setLiked(prev.liked);
          setCount(prev.count);
          return;
        }
        setLiked(res.liked);
        setCount(res.count);
        cache.set(itemId, res);
      } catch {
        setLiked(prev.liked);
        setCount(prev.count);
      } finally {
        busy.current = false;
      }
    },
    [itemId, liked, count, ready],
  );

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const textCls = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={ariaLabel ?? (liked ? "Unlike" : "Like")}
      title={liked ? "Unlike" : "Like"}
      className={`inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 shadow-sm ring-1 ring-border/60 backdrop-blur transition hover:bg-background ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${iconSize} transition-transform duration-200 ${
          pulse ? "scale-125" : "scale-100"
        } ${liked ? "text-rose-600" : "text-muted-foreground"}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showCount && count > 0 ? (
        <span className={`${textCls} font-medium text-muted-foreground`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default LikeButton;
