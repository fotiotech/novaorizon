import Hero from "@/components/Hero";
import MenuRenderer from "@/components/MenuRenderer";
import Recommendations from "@/components/recommandations/Recommendations";
import { TrendingItems } from "@/components/recommandations/trending/TrendingItems";

export default async function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <Recommendations />
      <TrendingItems limit={10} />
      <MenuRenderer location="Home" className="my-2" />
    </main>
  );
}
