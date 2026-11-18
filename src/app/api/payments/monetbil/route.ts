// app/api/payments/monetbil/route.ts
//
// Public webhook. The Express backend verifies the transaction with Monetbil
// and owns the order state machine; this route only forwards the params
// (Monetbil calls whichever URL is configured, and this one already has been
// registered with the gateway).
import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

async function handle(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await consumeRateLimit(`monetbil-notify:${ip}`, 120, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          params[key] = String(value ?? "");
        }
      }
    } else if (contentType.includes("form")) {
      const form = await req.formData().catch(() => null);
      form?.forEach((value, key) => {
        params[key] = String(value);
      });
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/monetbil/notify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[monetbil webhook] proxy failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
