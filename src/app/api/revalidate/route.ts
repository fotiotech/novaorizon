import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tags that this endpoint is allowed to purge. */
const ALLOWED_TAGS = new Set(["home-hero", "blocks", "tiles", "promotions"]);

/**
 * POST /api/revalidate
 * Body: { tag: "blocks" } / { tags: ["blocks", "home-hero"] }
 * Header: x-revalidate-secret: <REVALIDATE_SECRET>
 *
 * Called by the API after hero content changes; can also be hit manually.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret && !process.env.NEXT_PUBLIC_SERVER_URL) {
    return NextResponse.json(
      { error: "Revalidation is not configured" },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    // Fall back to the API, which owns the AWS-managed secret. This lets the
    // storefront run without REVALIDATE_SECRET in its environment.
    const apiBase = (process.env.NEXT_PUBLIC_SERVER_URL || "").replace(
      /\/+$/,
      "",
    );
    let verified = false;
    if (apiBase && provided) {
      try {
        const res = await fetch(`${apiBase}/api/internal/revalidate/verify`, {
          method: "POST",
          headers: { "x-revalidate-secret": provided },
          signal: AbortSignal.timeout(5_000),
        });
        verified = res.ok;
      } catch {
        verified = false;
      }
    }
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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