import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/app/actions/semanticSearch";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await semanticSearch(q, {}, 5);
  return NextResponse.json(results);
}
