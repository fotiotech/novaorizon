import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tags that this endpoint is allowed to purge. */
const ALLOWED_TAGS = new Set(["home-hero"]);

/**
 * POST /api/revalidate
 * Body: { tag: "home-hero" }  (or ?tag=home-hero)
 * Header: x-revalidate-secret: <REVALIDATE_SECRET>
 *
 * Called by the API after hero content changes; can also be hit manually.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET is not configured" },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tag = req.nextUrl.searchParams.get("tag") ?? "";
  if (!tag) {
    const body = await req.json().catch(() => ({}));
    tag = typeof body?.tag === "string" ? body.tag : "";
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return NextResponse.json(
      { error: "Unknown tag", allowed: [...ALLOWED_TAGS] },
      { status: 400 },
    );
  }

  // Next 16 requires a cache-life profile; "max" expires the entry fully.
  revalidateTag(tag, "max");
  return NextResponse.json({
    revalidated: true,
    tag,
    at: new Date().toISOString(),
  });
}