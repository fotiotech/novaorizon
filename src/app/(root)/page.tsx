// app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import BlockRenderer from "@/components/content/BlockRenderer";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      <Hero />

      <div className="mx-auto max-w-7xl px-3 md:px-6 lg:px-8">
        <BlockRenderer location="Home" />
      </div>
    </main>
  );
}
