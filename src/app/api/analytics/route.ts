import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/app/actions/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const events: any[] = Array.isArray(body?.events) ? body.events : [];
  if (events.length === 0) return NextResponse.json({ ok: true, count: 0 });
  if (events.length > 50) {
    return NextResponse.json(
      { ok: false, error: "batch too large" },
      { status: 413 },
    );
  }

  let accepted = 0;
  let skipped = 0;

  for (let i = 0; i < events.length; i += 10) {
    const chunk = events.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map((e) =>
        trackEvent({
          itemId: e.itemId,
          eventType: e.eventType,
          metadata: e.metadata,
          sessionId: e.sessionId,
          idempotencyKey: e.idempotencyKey,
        }).catch((err) => {
          console.error("[batch] event failed", err);
          return { ok: false } as const;
        }),
      ),
    );
    for (const r of results) {
      if (r.ok) accepted++;
      if ((r as any).skipped) skipped++;
    }
  }

  return NextResponse.json({ ok: true, accepted, skipped });
}
