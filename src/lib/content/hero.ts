import { unstable_cache } from "next/cache";
import { apiData } from "@/lib/server-api";
import type { HeroSection } from "@/constant/types";

/**
 * Hero slides are above the fold, so they are fetched on the server (and
 * cached) instead of being fetched in a client `useEffect` — that removes a
 * request waterfall and the layout shift caused by the loading skeleton.
 */
export const getCachedHeroSlides = unstable_cache(
  async (): Promise<HeroSection[]> => {
    try {
      const slides = await apiData<HeroSection[]>("/catalog/hero", {
        revalidate: 300,
      });
      return Array.isArray(slides) ? slides : [];
    } catch (error) {
      console.error("[hero] failed to load slides:", error);
      return [];
    }
  },
  ["home-hero"],
  { revalidate: 300, tags: ["home-hero"] },
);
