// app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import TrustBadgeStrip from "@/components/trust/TrustBadgeStrip";
import { listActiveTrustBadges } from "@/lib/api/trust-badge";
import { BlockRenderer } from "@/components/content/blocks/BlockRenderer";
import { getCachedBlocksForLocation } from "@/lib/content/blocks/getBlocksForLocation";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Fetch badges and blocks in parallel — both are server-side.
  const [blocks, badges] = await Promise.all([
    getCachedBlocksForLocation("Home"),
    listActiveTrustBadges(),
  ]);

  return (
    <main className=" min-h-screen">
      {/* Trust badges strip lives in the vertical gap between header and hero */}
      <TrustBadgeStrip badges={badges} />
      <Hero />
      <BlockRenderer blocks={blocks} />
    </main>
  );
}