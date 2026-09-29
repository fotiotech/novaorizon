import type { Metadata } from "next";
import Hero from "@/components/Hero";
import MenuRenderer from "@/components/MenuRenderer";

export const metadata: Metadata = {
  // Self-referencing canonical for the homepage.
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      <div className="">
        <Hero />
      </div>
      <MenuRenderer location="Home" className="my-2" />
    </main>
  );
}
