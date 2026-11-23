// app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import TrustBadgeStrip from "@/components/trust/TrustBadgeStrip";
import { listActiveTrustBadges } from "@/lib/api/trust-badge";
import { BlockRenderer } from "@/components/content/blocks/BlockRenderer";
import { getCachedBlocksForLocation } from "@/lib/content/blocks/getBlocksForLocation";
import { getCachedHeroSlides } from "@/lib/content/hero";
import { getCachedTiles } from "@/lib/content/tiles";
import { TileStrip } from "@/components/content/TileStrip";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Everything above the fold is server-rendered and cached.
  const [blocks, badges, heroSlides, tiles] = await Promise.all([
    getCachedBlocksForLocation("Home"),
    listActiveTrustBadges(),
    getCachedHeroSlides(),
    getCachedTiles(),
  ]);

  return (
    <main className=" min-h-screen lg:px-1">
      <TrustBadgeStrip badges={badges} />
      <Hero slides={heroSlides} />
      <TileStrip tiles={tiles} />
      <BlockRenderer blocks={blocks} />
    </main>
  );
}
