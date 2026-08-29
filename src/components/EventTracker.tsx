"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUserId } from "@/app/lib/useUserId";
import { trackEvent } from "@/app/actions/events";

type EventType = "view" | "cart_add" | "purchase" | "like" | "page_view";

interface EventTrackerProps {
  /** The item ID (required except for page_view if you use a dummy) */
  itemId?: string;
  /** The event type */
  eventType: EventType;
  /** Additional metadata to attach */
  metadata?: Record<string, any>;
  /** If true, tracks on mount. Default: true */
  autoTrack?: boolean;
  /** If true, tracks on every dependency change. Default: false */
  trackOnChange?: boolean;
  /** Dependencies to watch when trackOnChange is true */
  dependencies?: any[];
  /** Callback after tracking */
  onTrack?: (data: any) => void;
  /** Children - the component will render them (no wrapper) */
  children?: React.ReactNode;
}

/**
 * A declarative component that tracks events.
 * Use it like: <EventTracker eventType="view" itemId={productId} />
 *
 * For imperative usage, use the useTrackEvent hook below.
 */
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

  const track = useCallback(async () => {
    if (!userId) return;
    if (!itemId && eventType !== "page_view") {
      console.warn(
        "EventTracker: itemId is required for event type",
        eventType,
      );
      return;
    }
    try {
      const result = await trackEvent({
        itemId: itemId || "68bd1652065470559deb73a6", // dummy for page_view
        eventType,
        metadata,
      });
      onTrack?.(result);
    } catch (error) {
      console.error("EventTracker: tracking failed", error);
    }
  }, [userId, itemId, eventType, metadata, onTrack]);

  // Auto-track on mount
  useEffect(() => {
    if (autoTrack && userId && !hasTracked.current) {
      track();
      hasTracked.current = true;
    }
  }, [autoTrack, userId, track]);

  // Optional tracking on dependency changes
  useEffect(() => {
    if (trackOnChange && userId) {
      track();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trackOnChange, ...dependencies]);

  return <>{children}</>;
}

/**
 * Imperative hook to trigger tracking from anywhere.
 * Returns a `track` function.
 */
export function useTrackEvent() {
  const userId = useUserId();

  const track = useCallback(
    async ({
      itemId,
      eventType,
      metadata = {},
    }: {
      itemId?: string;
      eventType: EventType;
      metadata?: Record<string, any>;
    }) => {
      if (!userId) return;
      if (!itemId && eventType !== "page_view") {
        console.warn(
          "useTrackEvent: itemId is required for event type",
          eventType,
        );
        return;
      }
      return trackEvent({
        itemId: itemId || "000000000000000000000000",
        eventType,
        metadata,
      });
    },
    [userId],
  );

  return track;
}
