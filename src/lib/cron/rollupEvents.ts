// lib/cron/rollupEvents.ts
import { Event } from "@/models/Event";
import { EventRollup } from "@/models/EventRollup";

/**
 * Look-back window. Recomputing the last 7 days on every run means:
 *   - a missed cron self-heals (the next run catches it up),
 *   - late-arriving events within the hour are corrected,
 *   - hourly buckets survive the daily schedule.
 *
 * Cost: 7 × 24 = 168 hourly buckets per (eventType, itemId) pair. Output
 * grain, not a scan multiplier — the aggregation is still a single pass.
 */
const WINDOW_DAYS = 7;

export interface RollupResult {
  ok: boolean;
  buckets: number;
  window: { start: Date; end: Date };
  windowDays: number;
  error?: string;
}

export async function rollupEvents(): Promise<RollupResult> {
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const window = { start, end };

  try {
    const grouped = await Event.aggregate([
      { $match: { isBot: false, timestamp: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            bucket: { $dateTrunc: { date: "$timestamp", unit: "hour" } },
            eventType: "$eventType",
            itemId: { $ifNull: ["$itemId", null] },
          },
          count: { $sum: 1 },
          totalScore: { $sum: "$score" },
          uniqueUsers: { $addToSet: "$userId" },
        },
      },
    ]);

    if (grouped.length === 0) {
      return { ok: true, buckets: 0, window, windowDays: WINDOW_DAYS };
    }

    await EventRollup.bulkWrite(
      grouped.map((g) => ({
        updateOne: {
          filter: {
            bucket: g._id.bucket,
            eventType: g._id.eventType,
            itemId: g._id.itemId,
          },
          update: {
            $set: {
              bucket: g._id.bucket,
              eventType: g._id.eventType,
              itemId: g._id.itemId,
              count: g.count,
              totalScore: g.totalScore,
              uniqueUsers: g.uniqueUsers.slice(0, 10_000),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    return {
      ok: true,
      buckets: grouped.length,
      window,
      windowDays: WINDOW_DAYS,
    };
  } catch (err: any) {
    console.error("[cron/rollupEvents] failed:", err);
    return {
      ok: false,
      buckets: 0,
      window,
      windowDays: WINDOW_DAYS,
      error: err?.message ?? "Unknown rollup error",
    };
  }
}
