// lib/api/events.ts
//
// Client-side wrapper around the Express event endpoints. Replaces the old
// `app/actions/events.ts` server-action layer: every call goes straight to
// the API and the axios instance attaches the session/guest cookies.
import { isAxiosError } from "axios";
import api from "@/lib/api";

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

/** Matches the backend's serialized like state. */
export interface LikeState {
  liked: boolean;
  count: number;
}

/**
 * POST /api/events/track — public. The backend derives the actor from the
 * session cookie, falling back to the cart-session cookie for guests, and
 * filters bots at the service layer.
 */
export async function trackEvent(
  params: TrackEventParams,
): Promise<TrackEventResult> {
  const res = await api.post<TrackEventResult>("/events/track", params);
  return res.data ?? { ok: true };
}

/** The likes endpoint accepts at most 100 ids per request. */
const LIKE_IDS_PER_REQUEST = 100;

/**
 * GET /api/events/likes?ids=a,b,c
 *
 * Batch "did I like this?" + public "how many users currently like this" for
 * a set of products. Chunked because the endpoint caps a request at 100 ids —
 * a grid may mount more LikeButtons than that at once.
 */
export async function getLikeStates(
  itemIds: string[],
): Promise<Record<string, LikeState>> {
  const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
  if (ids.length === 0) return {};

  const out: Record<string, LikeState> = {};
  for (let i = 0; i < ids.length; i += LIKE_IDS_PER_REQUEST) {
    const chunk = ids.slice(i, i + LIKE_IDS_PER_REQUEST);
    const res = await api.get<{ data: Record<string, LikeState> }>(
      "/events/likes",
      { params: { ids: chunk.join(",") } },
    );
    Object.assign(out, res.data?.data ?? {});
  }
  return out;
}

/**
 * POST /api/events/toggle-like — flips the current user's like by appending a
 * `like`/`unlike` event. Returns `null` when the caller isn't authenticated
 * so the client can revert its optimistic update.
 */
export async function toggleLike(itemId: string): Promise<LikeState | null> {
  try {
    const res = await api.post<{ data: LikeState }>("/events/toggle-like", {
      itemId,
    });
    return res.data?.data ?? { liked: false, count: 0 };
  } catch (error) {
    // Guests cannot own a like; the backend answers 401.
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

/**
 * POST /api/events/merge-guest — requires a signed-in session (the backend
 * rejects it with 401 otherwise). Both identities are derived from the
 * cookies the axios instance sends: `session` for the user and `cart_sid`
 * for the guest.
 */
export async function mergeGuestEvents(
  _guestId?: string,
  _newUserId?: string,
): Promise<void> {
  await api.post("/events/merge-guest");
}
