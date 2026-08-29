import Hero from "@/components/Hero";
import MenuRenderer from "@/components/MenuRenderer";
import Recommendations from "@/components/recommandations/Recommendations";

export default async function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <Recommendations />
      <MenuRenderer location="Home" className="my-2" />
    </main>
  );
}
