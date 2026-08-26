import Hero from "@/components/Hero";
import MenuRenderer from "@/components/MenuRenderer";

export default async function HomePage() {
  return (
    <main>
      <div className="bg-white ">
        <Hero />
      </div>
      {/* Render all menus with location "Home" */}
      <MenuRenderer location="Home" className="my-8" />

      {/* You can also have other sections with different locations */}
      {/* <MenuRenderer location="Header" /> */}
    </main>
  );
}
