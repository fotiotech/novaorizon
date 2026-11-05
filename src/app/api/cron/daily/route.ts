// app/api/cron/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connection } from "@/utils/connection";
import { rollupEvents } from "@/app/lib/cron/rollupEvents";
import { refreshProductMetrics } from "@/app/lib/cron/refreshProductMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const startedAt = Date.now();

  try {
    await connection();
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: "connection",
        error: err?.message ?? "DB connection failed",
      },
      { status: 500 },
    );
  }

  // ── Stage 1: event rollup ──────────────────────────────────────
  // Must run first — metrics reads EventRollup.
  const rollup = await rollupEvents();
  if (!rollup.ok) {
    return NextResponse.json(
      {
        ok: false,
        stage: "rollup",
        rollup,
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }

  // ── Stage 2: product metrics ───────────────────────────────────
  const metrics = await refreshProductMetrics();
  if (!metrics.ok) {
    return NextResponse.json(
      {
        ok: false,
        stage: "metrics",
        rollup,
        metrics,
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }

  // ── Stage 3: purge storefront caches ───────────────────────────
  // Done once, at the end, only after both stages succeeded — a
  // partial run should leave the previous caches intact rather than
  // flash an empty section to users.
  revalidateTag("products", "max");
  revalidateTag("trending", "max");
  revalidateTag("bestsellers", "max");
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");

  return NextResponse.json({
    ok: true,
    rollup,
    metrics,
    elapsedMs: Date.now() - startedAt,
  });
}
