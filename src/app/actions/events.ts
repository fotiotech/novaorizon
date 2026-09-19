"use server";

import { connection } from "@/utils/connection";
import { Event, IEvent } from "@/models/Event";
import { getCurrentUserId } from "@/app/lib/getUserId";
import { revalidatePath } from "next/cache";
import mongoose, { Types } from "mongoose";
import Product from "@/models/Product";

type EventType = IEvent["eventType"];

interface TrackEventParams {
  itemId: string;
  eventType: EventType;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// ─── Helper: normalize a userId to an ObjectId when possible ──
// Aggregations do NOT auto-cast, so we must cast explicitly.
function toObjectIdOrRaw(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return value;
}

// ─── 1. Track any event (userId resolved server-side) ──

export async function trackEvent(params: TrackEventParams) {
  await connection();
  const { itemId, eventType, sessionId, metadata } = params;
  const userId = await getCurrentUserId();

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error(`Invalid itemId: ${itemId}`);
  }

  const scoreMap: Record<EventType, number> = {
    view: 1,
    cart_add: 3,
    purchase: 5,
    like: 2,
    page_view: 1,
  };

  const event = new Event({
    userId,
    itemId: new Types.ObjectId(itemId),
    eventType,
    score: scoreMap[eventType] || 1,
    sessionId,
    metadata,
    timestamp: new Date(),
  });

  await event.save();
  revalidatePath("/");
}

// ─── 2. Get personalized recommendations ──────────────

export async function getRecommendations(limit: number = 10) {
  await connection();
  const userId = toObjectIdOrRaw(await getCurrentUserId());

  // 1. Collect the user's interacted item ids
  const userInteractions = await Event.find({ userId }).select("itemId").lean();
  const interactedIds = userInteractions.map((i) => i.itemId).filter(Boolean);

  if (interactedIds.length === 0) {
    return getTrendingItems(limit);
  }

  // 2. Collaborative filtering pipeline
  const recommendations = await Event.aggregate([
    { $match: { itemId: { $in: interactedIds }, userId: { $ne: userId } } },
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

  return recommendations;
}

// ─── 3. Trending (fallback) ────────────────────────────

export async function getTrendingItems(limit: number = 10) {
  await connection();

  const trending = await Event.aggregate([
    {
      $match: {
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: "$itemId",
        viewCount: { $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] } },
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
    // Only surface active products
    { $match: { "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);

  // 🔥 If no trending products, fallback to recently added active products
  if (trending.length === 0) {
    return Product.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  return trending;
}

// ─── 4. Recently viewed (deduped by item, most recent first) ─────────

export async function getRecentlyViewed(limit: number = 5) {
  await connection();
  const userId = toObjectIdOrRaw(await getCurrentUserId());

  return Event.aggregate([
    { $match: { userId, eventType: "view" } },
    { $sort: { timestamp: -1 } },
    // Collapse repeated views of the same item so they don't consume slots.
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

// ─── 5. Merge guest events on login ────────────────────

export async function mergeGuestEvents(guestId: string, newUserId: string) {
  await connection();
  await Event.updateMany(
    { userId: toObjectIdOrRaw(guestId) },
    { $set: { userId: toObjectIdOrRaw(newUserId) } },
  );
}

// ─── 6. Related products (manual relations + fallback) ──

export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
) {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return [];
  }

  const product: any = await Product.findById(productId)
    .select("relatedProducts categoryId brand")
    .lean();
  if (!product) return [];

  // Product.relatedProducts is IRelatedProduct[] = { product: ObjectId, relationshipType?: string }[]
  // Extract only the ObjectId refs (with defensive fallbacks for legacy shapes).
  const relatedRefs: any[] = Array.isArray(product.relatedProducts)
    ? product.relatedProducts
    : [];

  const relatedIds: mongoose.Types.ObjectId[] = relatedRefs
    .map((r: any) => {
      if (!r) return null;
      if (typeof r === "string") return r;
      if (r.product) return r.product; // current schema shape
      if (r.id) return r.id; // legacy
      if (r._id) return r._id; // legacy
      return null;
    })
    .filter((id: any) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id: any) => new mongoose.Types.ObjectId(id));

  let products: any[] = [];

  // 1. Prefer manually configured relations
  if (relatedIds.length > 0) {
    products = await Product.find({
      _id: { $in: relatedIds },
      status: "active",
    })
      .limit(limit)
      .lean();
  }

  // 2. Fallback: same category, then same brand
  if (products.length === 0) {
    const fallbackQuery: any = {
      _id: { $ne: new mongoose.Types.ObjectId(productId) },
      status: "active",
    };
    if (product.categoryId) {
      fallbackQuery.categoryId = product.categoryId;
    } else if (product.brand) {
      fallbackQuery.brand = product.brand;
    }
    products = await Product.find(fallbackQuery).limit(limit).lean();
  }

  return products;
}
