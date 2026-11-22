// lib/content/blocks/getBlocksForLocation.ts
import { unstable_cache } from "next/cache";
import { apiData } from "@/lib/server-api";
import type { ResolvedBlock } from "@/lib/content/types";
import type { BlockLocation } from "@/lib/content/constants";

/**
 * Resolved content blocks for a storefront location.
 *
 * Resolution (manual references, rule queries, banners, promotions) happens
 * in the Express backend; this only fetches and caches the render payload.
 */
export async function getBlocksForLocation(
  location: BlockLocation,
): Promise<ResolvedBlock[]> {
  try {
    const blocks = await apiData<ResolvedBlock[]>("/catalog/blocks", {
      query: { location },
      // `unstable_cache` owns the cache; a nested force-cache would keep
      // deleted blocks alive indefinitely.
      cache: "no-store",
    });

    return Array.isArray(blocks) ? blocks : [];
  } catch (error) {
    console.error("[getBlocksForLocation] failed:", error);
    return [];
  }
}

export const getCachedBlocksForLocation = (location: BlockLocation) =>
  unstable_cache(() => getBlocksForLocation(location), ["blocks", location], {
    tags: ["blocks", `blocks:${location}`],
    revalidate: 300,
  })();
