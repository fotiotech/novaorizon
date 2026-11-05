// lib/cron/refreshProductMetrics.ts
import { EventRollup } from "@/models/EventRollup";
import Product from "@/models/Product";

const TRENDING_LIMIT = 100;
const BESTSELLER_LIMIT = 100;
const TRENDING_WINDOW_DAYS = 7;
const BESTSELLER_WINDOW_DAYS = 30;
const NEW_ARRIVAL_DAYS = 30;

export interface MetricsResult {
  ok: boolean;
  trending: number;
  bestsellers: number;
  newArrivals: number;
  at: string;
  error?: string;
}

export async function refreshProductMetrics(): Promise<MetricsResult> {
  const now = new Date();
  const stamp = new Date();
  const at = stamp.toISOString();

  const trendingSince = new Date(
    now.getTime() - TRENDING_WINDOW_DAYS * 86_400_000,
  );
  const bestsellerSince = new Date(
    now.getTime() - BESTSELLER_WINDOW_DAYS * 86_400_000,
  );
  const newSince = new Date(now.getTime() - NEW_ARRIVAL_DAYS * 86_400_000);

  try {
    // ── 1. Trending: weighted score across all event types, 7d ────
    const trending = await EventRollup.aggregate([
      { $match: { bucket: { $gte: trendingSince }, itemId: { $ne: null } } },
      { $group: { _id: "$itemId", score: { $sum: "$totalScore" } } },
      { $sort: { score: -1 } },
      { $limit: TRENDING_LIMIT },
    ]);

    // ── 2. Bestsellers: purchase count, 30d ───────────────────────
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

    // ── 3. Clear ranks that no longer apply ───────────────────────
    await Product.updateMany(
      { $or: [{ trendingRank: { $gt: 0 } }, { bestsellerRank: { $gt: 0 } }] },
      {
        $set: {
          isTrending: false,
          trendingRank: 0,
          isBestseller: false,
          bestsellerRank: 0,
        },
      },
    );

    // ── 4. Apply new ranks in one bulkWrite ───────────────────────
    const patch = new Map<string, Record<string, any>>();

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
          updateOne: { filter: { _id: id }, update: { $set } },
        })),
        { ordered: false },
      );
    }

    // ── 5. New arrivals ───────────────────────────────────────────
    await Product.updateMany(
      { createdAt: { $gte: newSince }, isNew: { $ne: true } },
      { $set: { isNew: true } },
    );
    await Product.updateMany(
      { createdAt: { $lt: newSince }, isNew: true },
      { $set: { isNew: false } },
    );

    const newArrivals = await Product.countDocuments({ isNew: true });

    return {
      ok: true,
      trending: trending.length,
      bestsellers: bestsellers.length,
      newArrivals,
      at,
    };
  } catch (err: any) {
    console.error("[cron/refreshProductMetrics] failed:", err);
    return {
      ok: false,
      trending: 0,
      bestsellers: 0,
      newArrivals: 0,
      at,
      error: err?.message ?? "Unknown metrics error",
    };
  }
}
