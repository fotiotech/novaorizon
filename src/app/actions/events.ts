// app/actions/events.ts
"use server";

import { connection } from "@/utils/connection";
import { Event, IEvent } from "@/models/Event";
import { getCurrentUserId } from "@/app/lib/getUserId";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import mongoose, { Types } from "mongoose";
import Product from "@/models/Product";
import { isBot, detectDevice } from "../lib/events/botDetection";
import Pusher from "pusher"; // optional — remove if not using Pusher
import { requireUser } from "@/lib/authz";
import { getGuestId } from "@/lib/guest";
import { EventRollup } from "@/models/EventRollup";
import { DailyStats } from "@/models/DailyStats";
import { VisitorDay } from "@/models/VisitorDay";

type EventType = IEvent["eventType"];

interface TrackEventParams {
  itemId?: string;
  eventType: EventType;
  sessionId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

// ─── Optional Pusher publisher ────────────────────────────
const pusher =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
    : null;

// helper at module scope
function formatDay(d: Date): string {
  // UTC day key — "2026-09-27"
  return d.toISOString().slice(0, 10);
}

async function publishEvent(payload: Record<string, any>) {
  if (!pusher) return;
  try {
    await pusher.trigger("analytics", "event", payload);
  } catch (err) {
    console.error("[events] pusher publish failed", err);
  }
}

// ─── 1. Track ─────────────────────────────────────────────
export async function trackEvent(params: TrackEventParams) {
  await connection();
  const { itemId, eventType, sessionId, metadata, idempotencyKey } = params;
  const userId = await getCurrentUserId();

  const h = await headers();
  const ua = h.get("user-agent") ?? "";

  if (isBot(ua)) return { ok: true, skipped: "bot" } as const;

  if (idempotencyKey) {
    const existing = await Event.findOne({ idempotencyKey })
      .select("_id")
      .lean();
    if (existing) return { ok: true, skipped: "duplicate" } as const;
  }

  if (itemId && !mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error(`Invalid itemId: ${itemId}`);
  }

  const scoreMap: Record<EventType, number> = {
    view: 1,
    cart_add: 3,
    purchase: 5,
    like: 2,
    unlike: -2,
    share: 3,
    page_view: 1,
  };

  const event = new Event({
    userId,
    itemId: itemId ? new Types.ObjectId(itemId) : undefined,
    eventType,
    score: scoreMap[eventType] ?? 1,
    sessionId,
    metadata,
    isBot: false,
    idempotencyKey,
    context: {
      userAgent: ua,
      referrer: h.get("referer") ?? undefined,
      country:
        h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? undefined,
      device: detectDevice(ua),
      locale: h.get("accept-language")?.split(",")[0],
    },
    timestamp: new Date(),
  });

  try {
    await event.save();

    const day = formatDay(event.timestamp as Date);

    const [visitorResult, priorVisit] = await Promise.all([
      VisitorDay.updateOne(
        { day, userId },
        { $setOnInsert: { day, userId, firstSeenAt: event.timestamp } },
        { upsert: true },
      ),
      // Check if this user has been seen on any earlier day
      VisitorDay.findOne({ userId, day: { $lt: day } })
        .select("_id")
        .lean(),
    ]);

    const isFirstToday = visitorResult.upsertedCount > 0;
    const isReturning = !!priorVisit;

    const inc: Record<string, number> = {
      events: 1,
      [`eventCounts.${eventType}`]: 1,
    };
    if (isFirstToday) {
      inc.visitors = 1;
      if (isReturning) inc.returningVisitors = 1;
      else inc.newVisitors = 1;
    }
    if (eventType === "purchase" && metadata?.total) {
      const total = Number(metadata.total);
      if (Number.isFinite(total)) inc.revenue = total;
    }

    await DailyStats.updateOne(
      { day },
      {
        $inc: inc,
        $set: { updatedAt: new Date() },
        $setOnInsert: { day },
      },
      { upsert: true },
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      return { ok: true, skipped: "duplicate" } as const;
    }
    throw err;
  }

  void publishEvent({
    _id: String(event._id),
    userId,
    itemId: itemId ?? null,
    eventType,
    score: event.score,
    metadata: metadata ?? {},
    timestamp: event.timestamp,
  });

  if (
    eventType === "purchase" ||
    eventType === "like" ||
    eventType === "unlike"
  ) {
    revalidatePath("/");
  }

  return { ok: true, id: String(event._id) } as const;
}

// ─── 2. Incremental fetch (internal; not a public action) ─
async function getEventsSince(since: number, limit = 50) {
  await connection();
  return Event.find({
    isBot: { $ne: true },
    timestamp: { $gt: new Date(since) },
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
}

// ─── 3. Recommendations ───────────────────────────────────
export async function getRecommendations(limit: number = 10) {
  await connection();
  const userId = await getCurrentUserId();

  const userInteractions = await Event.find({ userId, isBot: false })
    .select("itemId")
    .lean();
  const interactedIds = userInteractions.map((i) => i.itemId).filter(Boolean);

  if (interactedIds.length === 0) {
    return getTrendingItems(limit);
  }

  return Event.aggregate([
    {
      $match: {
        isBot: { $ne: true },
        itemId: { $in: interactedIds },
        userId: { $ne: userId },
      },
    },
    {
      $group: {
        _id: "$userId",
        items: { $addToSet: "$itemId" },
        totalScore: { $sum: "$score" },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: 20 },
    { $unwind: "$items" },
    { $match: { items: { $nin: interactedIds } } },
    {
      $group: {
        _id: "$items",
        recommendationScore: { $sum: "$totalScore" },
      },
    },
    { $sort: { recommendationScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $match: { product: { $ne: null }, "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);
}

// ─── 4. Trending (fallback) ───────────────────────────────
export async function getTrendingItems(limit: number = 10) {
  await connection();

  const trending = await Event.aggregate([
    {
      $match: {
        isBot: { $ne: true },
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: "$itemId",
        viewCount: {
          $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] },
        },
        purchaseCount: {
          $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        score: { $add: ["$viewCount", { $multiply: ["$purchaseCount", 3] }] },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);

  if (trending.length === 0) {
    return Product.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
  return trending;
}

// ─── 5. Recently viewed ───────────────────────────────────
export async function getRecentlyViewed(limit: number = 5) {
  await connection();
  const userId = await getCurrentUserId();

  return Event.aggregate([
    { $match: { userId, isBot: { $ne: true }, eventType: "view" } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$itemId",
        lastViewedAt: { $first: "$timestamp" },
      },
    },
    { $sort: { lastViewedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);
}

// ─── 6. Merge guest events ────────────────────────────────
export async function mergeGuestEvents(_guestId?: string, _newUserId?: string) {
  const user = await requireUser();
  const guestId = await getGuestId();
  if (!guestId) return;
  await connection();
  await Event.updateMany({ userId: guestId }, { $set: { userId: user.id } });
}

// ─── 7. Related products ──────────────────────────────────
export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
) {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(productId)) return [];

  const product: any = await Product.findById(productId)
    .select("relatedProducts categoryId brand")
    .lean();
  if (!product) return [];

  const relatedRefs: any[] = Array.isArray(product.relatedProducts)
    ? product.relatedProducts
    : [];

  const relatedIds: mongoose.Types.ObjectId[] = relatedRefs
    .map((r: any) => {
      if (!r) return null;
      if (typeof r === "string") return r;
      if (r.product) return r.product;
      if (r.id) return r.id;
      if (r._id) return r._id;
      return null;
    })
    .filter((id: any) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id: any) => new mongoose.Types.ObjectId(id));

  let products: any[] = [];

  if (relatedIds.length > 0) {
    products = await Product.find({
      _id: { $in: relatedIds },
      status: "active",
    })
      .limit(limit)
      .lean();
  }

  if (products.length === 0) {
    const fallbackQuery: any = {
      _id: { $ne: new mongoose.Types.ObjectId(productId) },
      status: "active",
    };
    if (product.categoryId) fallbackQuery.categoryId = product.categoryId;
    else if (product.brand) fallbackQuery.brand = product.brand;
    products = await Product.find(fallbackQuery).limit(limit).lean();
  }

  return products;
}

// ─── 8. Rollup-backed fast trending (over 7d) ─────────────
export async function getTrendingItemsFast(days = 7, limit = 10) {
  await connection();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return EventRollup.aggregate([
    { $match: { bucket: { $gte: since }, itemId: { $ne: null } } },
    { $group: { _id: "$itemId", score: { $sum: "$totalScore" } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);
}

// ─── 9. Likes ─────────────────────────────────────────────

export interface LikeState {
  liked: boolean;
  count: number;
}

/**
 * Batch "did I like this?" + public "how many users currently like this"
 * for a set of products.
 *
 * Both values are derived from the latest like/unlike event per
 * `(itemId, userId)` — a `like` event means "liked", an `unlike` event
 * means "not liked". The `$sort` + `$group` + `$first` pattern is the
 * "last event wins" fold.
 *
 * Bots never reach the `Event` collection (trackEvent() rejects them at
 * the door), so no `isBot` filter is required here.
 */
export async function getLikeStates(
  itemIds: string[],
): Promise<Record<string, LikeState>> {
  if (!Array.isArray(itemIds) || itemIds.length === 0) return {};
  const validIds = itemIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return {};

  await connection();
  const objIds = validIds.map((id) => new Types.ObjectId(id));
  const userId = await getCurrentUserId();

  const [counts, mine] = await Promise.all([
    Event.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          itemId: { $in: objIds },
          eventType: { $in: ["like", "unlike"] },
        },
      },
      { $sort: { timestamp: -1, _id: -1 } },
      {
        $group: {
          _id: { itemId: "$itemId", userId: "$userId" },
          lastType: { $first: "$eventType" },
        },
      },
      { $match: { lastType: "like" } },
      { $group: { _id: "$_id.itemId", count: { $sum: 1 } } },
    ]),
    userId
      ? Event.aggregate<{ _id: Types.ObjectId }>([
          {
            $match: {
              userId,
              itemId: { $in: objIds },
              eventType: { $in: ["like", "unlike"] },
            },
          },
          { $sort: { timestamp: -1, _id: -1 } },
          {
            $group: { _id: "$itemId", lastType: { $first: "$eventType" } },
          },
          { $match: { lastType: "like" } },
        ])
      : Promise.resolve([] as { _id: Types.ObjectId }[]),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const likedSet = new Set(mine.map((m) => String(m._id)));

  const out: Record<string, LikeState> = {};
  for (const id of validIds) {
    out[id] = { liked: likedSet.has(id), count: countMap.get(id) ?? 0 };
  }
  return out;
}

/**
 * Flip the current user's like state for `itemId` by appending a
 * `like`/`unlike` event. Returns `null` when the caller isn't
 * authenticated so the client can revert its optimistic update.
 *
 * The write goes through `trackEvent()` so we inherit bot filtering,
 * request headers, Pusher publishing, and `DailyStats` counters.
 */
export async function toggleLike(itemId: string): Promise<LikeState | null> {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error("Invalid itemId");
  }
  const userId = await getCurrentUserId();
  if (!userId) return null;

  await connection();
  const _id = new Types.ObjectId(itemId);

  const last = await Event.findOne({
    userId,
    itemId: _id,
    eventType: { $in: ["like", "unlike"] },
  })
    .sort({ timestamp: -1, _id: -1 })
    .select("eventType")
    .lean();

  const currentlyLiked = last?.eventType === "like";
  const nextType: "like" | "unlike" = currentlyLiked ? "unlike" : "like";

  await trackEvent({ itemId, eventType: nextType });

  // Re-derive from the source of truth so the caller gets the truth even
  // if `trackEvent` skipped the write (e.g. bot UA).
  const states = await getLikeStates([itemId]);
  return states[itemId] ?? { liked: false, count: 0 };
}
