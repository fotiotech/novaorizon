// lib/api/events.server.ts
//
// Server-side wrapper around the Express event endpoints, used by Server
// Components and Route Handlers. Replaces the old `app/actions/events.ts`
// server-action layer; every call goes through `@/lib/server-api` so the
// browser's session/guest cookies are forwarded and the request never hangs
// (10s timeout).
//
// Reads never throw: a build or prerender where the API is unreachable
// degrades to an empty list instead of failing the render.
import "server-only";

import { revalidatePath } from "next/cache";
import { ApiError, apiData } from "@/lib/server-api";

/** Event kinds accepted by the backend. */
export type EventType =
  | "view"
  | "cart_add"
  | "purchase"
  | "like"
  | "unlike"
  | "share"
  | "page_view";

export interface TrackEventParams {
  itemId?: string;
  eventType: EventType;
  sessionId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

/** Envelope returned by `POST /api/events/track`. */
export interface TrackEventResult {
  ok: true;
  id?: string;
  skipped?: "bot" | "duplicate" | "anonymous";
}

/**
 * POST /api/events/track — the actor (session user, or the guest behind the
 * cart-session cookie) is resolved by the backend.
 */
export async function trackEvent(
  params: TrackEventParams,
): Promise<TrackEventResult> {
  const data = await apiData<TrackEventResult>("/events/track", {
    method: "POST",
    body: params,
  });

  // Kept from the server action: like/unlike/purchase changes the product
  // cards rendered by cached pages.
  if (
    params.eventType === "purchase" ||
    params.eventType === "like" ||
    params.eventType === "unlike"
  ) {
    revalidatePath("/");
  }

  return data ?? { ok: true };
}

/** GET /api/events/trending — 7-day view/purchase ranking. */
export async function getTrendingItems(limit: number = 10): Promise<any[]> {
  try {
    const data = await apiData<any[]>("/events/trending", {
      query: { limit },
      cache: "force-cache",
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[events] getTrendingItems failed:", error);
    return [];
  }
}

/**
 * GET /api/events/recommendations — authenticated. Anonymous visitors used to
 * get the trending fallback from the old action, so a 401 keeps that shape.
 */
export async function getRecommendations(limit: number = 10): Promise<any[]> {
  try {
    const data = await apiData<any[]>("/events/recommendations", {
      query: { limit },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return getTrendingItems(limit);
    }
    console.error("[events] getRecommendations failed:", error);
    return [];
  }
}

/** GET /api/events/recently-viewed — authenticated, empty for guests. */
export async function getRecentlyViewed(limit: number = 5): Promise<any[]> {
  try {
    const data = await apiData<any[]>("/events/recently-viewed", {
      query: { limit },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[events] getRecentlyViewed failed:", error);
    return [];
  }
}

/** GET /api/events/related/:productId — manual relations, then category/brand. */
export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
): Promise<any[]> {
  if (!productId) return [];
  try {
    // Public, catalog-derived data → safe to cache for ISR product pages.
    const data = await apiData<any[]>(
      `/events/related/${encodeURIComponent(productId)}`,
      { query: { limit }, cache: "force-cache" },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[events] getRelatedProducts failed:", error);
    return [];
  }
}

/** GET /api/events/trending-fast — rollup-backed trending over `days`. */
export async function getTrendingItemsFast(
  days = 7,
  limit = 10,
): Promise<any[]> {
  try {
    const data = await apiData<any[]>("/events/trending-fast", {
      query: { days, limit },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[events] getTrendingItemsFast failed:", error);
    return [];
  }
}
