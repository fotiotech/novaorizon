// lib/queryEmbeddingCache.ts

/**
 * Tiny in-memory LRU for query embeddings.
 *
 * Why this exists: every keystroke that survives the 300ms debounce
 * would otherwise hit Voyage once. On an e-commerce site the query
 * distribution is heavily skewed — "earbuds", "oraimo", "watch", and
 * a handful of other strings dominate. Caching by normalized query
 * string cuts Voyage calls by 60–80% on realistic traffic at the cost
 * of a few kilobytes of memory.
 *
 * Scope: process-wide. On a long-running Node server (Docker, VPS,
 * pm2) this survives for the lifetime of the process. On Vercel
 * serverless it resets per cold start — still valuable, just less so.
 * If you later need cross-instance sharing, back it with Redis or a
 * Mongo TTL collection; the API here is intentionally narrow so you
 * can swap the backing store without touching call sites.
 *
 * No TTL: embeddings for a given string never go stale — the model
 * is pinned and the input is deterministic. Capping by size is enough
 * to bound memory.
 */

const MAX_ENTRIES = 500;

// JS Maps preserve insertion order. We exploit that: newest entry is
// last, oldest is first. On a hit we delete-then-set to move the entry
// to the tail, which is the classic O(1) LRU trick.
const cache = new Map<string, number[]>();

function normalizeKey(query: string): string {
  return query.trim().toLowerCase();
}

export function getCachedQueryEmbedding(query: string): number[] | null {
  const key = normalizeKey(query);
  if (!key) return null;

  const hit = cache.get(key);
  if (!hit) return null;

  // Move to tail — marks as most recently used.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

export function setCachedQueryEmbedding(query: string, vector: number[]): void {
  const key = normalizeKey(query);
  if (!key) return;

  // If it already exists, delete first so the re-set moves it to the
  // tail instead of leaving a duplicate insertion position.
  if (cache.has(key)) cache.delete(key);
  cache.set(key, vector);

  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Diagnostics only. Useful from a one-off admin endpoint or during
 * load testing to see hit rate. Not called from the hot path.
 */
export function queryEmbeddingCacheStats(): {
  size: number;
  maxEntries: number;
} {
  return { size: cache.size, maxEntries: MAX_ENTRIES };
}
