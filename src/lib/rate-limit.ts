// lib/rate-limit.ts
//
// In-memory fixed-window limiter for Next.js route handlers. The Express
// backend has its own limiter for API calls; this only protects the few
// Next-side handlers that still exist.
import { headers } from "next/headers";

interface Bucket {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, Bucket>();

export async function getClientIp(): Promise<string> {
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return store.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  bucket.count += 1;

  // Opportunistic cleanup to keep the map bounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.expiresAt <= now) buckets.delete(k);
    }
  }

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
  };
}
