// app/api/autocomplete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { autocompleteProducts } from "@/app/actions/autocomplete";
import { semanticSearch } from "@/app/actions/semanticSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Below this length, an embedding is too noisy to be useful — and the
// Voyage round-trip isn't worth paying for a query the user is still
// typing. Tune up if you notice weak semantic suggestions polluting
// the dropdown.
const MIN_SEMANTIC_LENGTH = 4;

// Cap on semantic fill. The remainder of the dropdown is filled from
// edgeGram hits, so this doesn't need to be large.
const SEMANTIC_LIMIT = 6;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "8", 10);

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const trimmed = q.trim();

  try {
    // ---- 1. Fast path: edgeGram autocomplete -----------------------
    // Always runs. Cheapest and most precise for what the user is
    // literally typing.
    const exactRaw = await autocompleteProducts(trimmed, limit);
    const exact: any[] = Array.isArray(exactRaw) ? exactRaw : [];

    // ---- 2. Slow path: semantic, only when it adds value ----------
    // Skip if edgeGram already filled the dropdown, or if the query
    // is too short to embed meaningfully. This keeps the Voyage cost
    // off the hot path — the vast majority of keystrokes never reach
    // the API.
    const shouldRunSemantic =
      trimmed.length >= MIN_SEMANTIC_LENGTH && exact.length < limit;

    let semantic: any[] = [];
    if (shouldRunSemantic) {
      try {
        const res = await semanticSearch(trimmed, {}, SEMANTIC_LIMIT);
        const exactIds = new Set(exact.map((r) => String(r._id)));

        // Map semantic hits into the same shape as edgeGram results,
        // so the client can render one list. Dedupe against exact so
        // a product never appears twice.
        semantic = res.hits
          .filter((h) => !exactIds.has(String(h._id)))
          .map((h) => ({
            _id: h._id,
            name: h._source?.name ?? "",
            listPrice:
              Number(h._source?.price) || Number(h._source?.listPrice) || 0,
            mainImage: h._source?.images?.[0] ?? h._source?.mainImage ?? "",
            tags: h._source?.tags ?? [],
            // Client-facing tag. Ignore it and the list still works —
            // but it lets you group or style semantic results
            // differently in the dropdown if you want to.
            _match: "semantic" as const,
          }));
      } catch (err) {
        // Semantic is best-effort. If Voyage is down or the index is
        // rebuilding, the dropdown still shows edgeGram results.
        console.warn("[autocomplete] semantic unavailable:", err);
      }
    }

    // ---- 3. Merge -------------------------------------------------
    // Exact first (most precise), semantic fill the tail, capped at
    // `limit`. Tagging `_match` on both lets the client decide
    // whether to visually distinguish them.
    const merged = [
      ...exact.map((r) => ({ ...r, _match: "exact" as const })),
      ...semantic,
    ].slice(0, limit);

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
