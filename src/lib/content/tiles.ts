import { unstable_cache } from "next/cache";
import { apiData } from "@/lib/server-api";

export interface Tile {
  _id: string;
  title: string;
  imageUrl?: string | null;
  link?: string | null;
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  order?: number;
}

/**
 * Active shortcut tiles, shown directly below the hero.
 * Cached with a `tiles` tag; admin mutations purge it through
 * `POST /api/revalidate`.
 */
export const getCachedTiles = unstable_cache(
  async (): Promise<Tile[]> => {
    try {
      const tiles = await apiData<Tile[]>("/tiles", { cache: "no-store" });
      return Array.isArray(tiles) ? tiles : [];
    } catch (error) {
      console.error("[getCachedTiles] failed:", error);
      return [];
    }
  },
  ["home-tiles"],
  { tags: ["tiles"], revalidate: 300 },
);