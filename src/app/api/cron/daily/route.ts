// app/api/cron/daily/route.ts
//
// Thin proxy to the Express cron jobs (rollups + product metrics). Vercel cron
// keeps calling this URL; the backend owns the aggregation.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_BASE = (
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

async function callJob(path: string, authorization: string) {
  const res = await fetch(`${API_BASE}/api/cron/${path}`, {
    method: "POST",
    headers: { authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const body = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  return { status: res.status, body: parsed };
}

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const rollup = await callJob("rollup", authorization);
    const metrics = await callJob("product-metrics", authorization);

    return NextResponse.json({
      ok: rollup.status < 300 && metrics.status < 300,
      durationMs: Date.now() - startedAt,
      rollup,
      metrics,
    });
  } catch (error: any) {
    console.error("[cron/daily] proxy failed:", error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Cron job failed" },
      { status: 502 },
    );
  }
}
