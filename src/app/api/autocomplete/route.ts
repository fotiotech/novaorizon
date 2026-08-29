import { NextRequest, NextResponse } from "next/server";
import { autocompleteProducts } from "@/app/actions/autocomplete";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "8", 10);

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await autocompleteProducts(q, limit);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
