// app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import TrustBadgeStrip from "@/components/trust/TrustBadgeStrip";
import { listActiveTrustBadges } from "@/lib/api/trust-badge";
import { BlockRenderer } from "@/components/content/blocks/BlockRenderer";
import { getCachedBlocksForLocation } from "@/lib/content/blocks/getBlocksForLocation";
import { getCachedHeroSlides } from "@/lib/content/hero";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Everything above the fold is server-rendered and cached.
  const [blocks, badges, heroSlides] = await Promise.all([
    getCachedBlocksForLocation("Home"),
    listActiveTrustBadges(),
    getCachedHeroSlides(),
  ]);

  return (
    <main className=" min-h-screen">
      {/* Trust badges strip lives in the vertical gap between header and hero */}
      <TrustBadgeStrip badges={badges} />
      <Hero slides={heroSlides} />
      <BlockRenderer blocks={blocks} />
    </main>
  );
}