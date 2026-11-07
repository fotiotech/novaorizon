// app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import { BlockRenderer } from "@/components/content/blocks/BlockRenderer";
import { getCachedBlocksForLocation } from "@/lib/content/blocks/getBlocksForLocation";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const blocks = await getCachedBlocksForLocation("Home");

  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <BlockRenderer blocks={blocks} />
    </main>
  );
}
