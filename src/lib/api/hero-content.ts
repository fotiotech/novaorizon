// lib/api/hero-content.ts
import api from "@/lib/api";
import type { HeroSection } from "@/constant/types";

/**
 * Storefront hero slides — public catalogue endpoint
 * (`GET /api/catalog/hero`). Mirrors the old `findHeroContent()`: newest
 * first, JSON-safe rows, and an empty list (skeleton) when nothing is
 * published or the API is unreachable.
 */
export async function findHeroContent(): Promise<HeroSection[]> {
  try {
    const res = await api.get<{ data: HeroSection[] }>("/catalog/hero", {
      timeout: 10_000,
    });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[findHeroContent] failed:", error);
    return [];
  }
}
