import { NextRequest, NextResponse } from "next/server";
import { connection } from "@/utils/connection";
import { Event } from "@/models/Event";
import { EventRollup } from "@/models/EventRollup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  await connection();

  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 60 * 60 * 1000);

  const grouped = await Event.aggregate([
    { $match: { isBot: false, timestamp: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
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
    return NextResponse.json({ ok: true, buckets: 0, window: { start, end } });
  }

  await EventRollup.bulkWrite(
    grouped.map((g) => ({
      updateOne: {
        filter: {
          bucket: start,
          eventType: g._id.eventType,
          itemId: g._id.itemId,
        },
        update: {
          $set: {
            bucket: start,
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
  );

  return NextResponse.json({
    ok: true,
    buckets: grouped.length,
    window: { start, end },
  });
}
