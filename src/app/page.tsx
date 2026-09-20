import Hero from "@/components/Hero";
import MenuRenderer from "@/components/MenuRenderer";

export default async function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      {/* Pull hero up so it starts at the very top, behind the fixed header */}
      <div className="pt-11">
        <Hero />
      </div>
      <MenuRenderer location="Home" className="my-2" />
    </main>
  );
}
