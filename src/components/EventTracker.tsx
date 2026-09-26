"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUserId } from "@/app/lib/useUserId";
import { enqueue, flush } from "@/app/lib/events/trackQueue";

type EventType = "view" | "cart_add" | "purchase" | "like" | "page_view";

interface EventTrackerProps {
  itemId?: string;
  eventType: EventType;
  metadata?: Record<string, any>;
  autoTrack?: boolean;
  trackOnChange?: boolean;
  dependencies?: any[];
  onTrack?: (data: any) => void;
  children?: React.ReactNode;
}

export function EventTracker({
  itemId,
  eventType,
  metadata = {},
  autoTrack = true,
  trackOnChange = false,
  dependencies = [],
  onTrack,
  children,
}: EventTrackerProps) {
  const userId = useUserId();
  const hasTracked = useRef(false);

  const track = useCallback(() => {
    if (!userId) return;
    if (!itemId && eventType !== "page_view") {
      console.warn("EventTracker: itemId required for", eventType);
      return;
    }
    enqueue({ itemId, eventType, metadata });
    onTrack?.({ queued: true });
  }, [userId, itemId, eventType, metadata, onTrack]);

  useEffect(() => {
    if (autoTrack && userId && !hasTracked.current) {
      track();
      hasTracked.current = true;
    }
  }, [autoTrack, userId, track]);

  useEffect(() => {
    if (trackOnChange && userId) track();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trackOnChange, ...dependencies]);

  return <>{children}</>;
}

export function useTrackEvent() {
  const userId = useUserId();

  return useCallback(
    ({
      itemId,
      eventType,
      metadata = {},
    }: {
      itemId?: string;
      eventType: EventType;
      metadata?: Record<string, any>;
    }) => {
      if (!userId) return;
      enqueue({ itemId, eventType, metadata });
    },
    [userId],
  );
}

// Manual flush helper (e.g. on checkout completion)
export { flush };
