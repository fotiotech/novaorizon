// app/api/cron/product-metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connection } from "@/utils/connection";
import { EventRollup } from "@/models/EventRollup";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TRENDING_LIMIT = 100;
const BESTSELLER_LIMIT = 100;
const NEW_ARRIVAL_DAYS = 30;
const TRENDING_WINDOW_DAYS = 7;
const BESTSELLER_WINDOW_DAYS = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  await connection();

  const now = new Date();
  const trendingSince = new Date(
    now.getTime() - TRENDING_WINDOW_DAYS * 86_400_000,
  );
  const bestsellerSince = new Date(
    now.getTime() - BESTSELLER_WINDOW_DAYS * 86_400_000,
  );
  const newSince = new Date(now.getTime() - NEW_ARRIVAL_DAYS * 86_400_000);

  // ── 1. Trending: weighted score across all event types, 7d ──────
  const trending = await EventRollup.aggregate([
    { $match: { bucket: { $gte: trendingSince }, itemId: { $ne: null } } },
    { $group: { _id: "$itemId", score: { $sum: "$totalScore" } } },
    { $sort: { score: -1 } },
    { $limit: TRENDING_LIMIT },
  ]);

  // ── 2. Bestsellers: purchase count, 30d ────────────────────────
  const bestsellers = await EventRollup.aggregate([
    {
      $match: {
        bucket: { $gte: bestsellerSince },
        itemId: { $ne: null },
        eventType: "purchase",
      },
    },
    { $group: { _id: "$itemId", count: { $sum: "$count" } } },
    { $sort: { count: -1 } },
    { $limit: BESTSELLER_LIMIT },
  ]);

  // ── 3. Clear ranks that no longer apply (only what's stale) ─────
  await Product.updateMany(
    {
      $or: [{ trendingRank: { $gt: 0 } }, { bestsellerRank: { $gt: 0 } }],
    },
    {
      $set: {
        isTrending: false,
        trendingRank: 0,
        isBestseller: false,
        bestsellerRank: 0,
      },
    },
  );

  // ── 4. Apply new ranks in one bulkWrite ────────────────────────
  const patch = new Map<string, Record<string, any>>();
  const stamp = new Date();

  trending.forEach((r, i) => {
    const key = String(r._id);
    patch.set(key, {
      ...(patch.get(key) ?? {}),
      isTrending: true,
      trendingRank: i + 1,
      metricsUpdatedAt: stamp,
    });
  });

  bestsellers.forEach((r, i) => {
    const key = String(r._id);
    patch.set(key, {
      ...(patch.get(key) ?? {}),
      isBestseller: true,
      bestsellerRank: i + 1,
      metricsUpdatedAt: stamp,
    });
  });

  if (patch.size > 0) {
    await Product.bulkWrite(
      Array.from(patch.entries()).map(([id, $set]) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set },
        },
      })),
    );
  }

  // ── 5. New arrivals ────────────────────────────────────────────
  await Product.updateMany(
    { createdAt: { $gte: newSince }, isNew: { $ne: true } },
    { $set: { isNew: true } },
  );
  await Product.updateMany(
    { createdAt: { $lt: newSince }, isNew: true },
    { $set: { isNew: false } },
  );

  // ── 6. Purge storefront caches ─────────────────────────────────
  revalidateTag("products", "max");
  revalidateTag("trending", "max");
  revalidateTag("bestsellers", "max");
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");

  return NextResponse.json({
    ok: true,
    trending: trending.length,
    bestsellers: bestsellers.length,
    newArrivals: await Product.countDocuments({ isNew: true }),
    at: stamp.toISOString(),
  });
}
