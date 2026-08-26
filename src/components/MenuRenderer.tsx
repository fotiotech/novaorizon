// components/menu/MenuRenderer.tsx
import { getMenusByLocation } from "@/app/actions/menu";
import Link from "next/link";
import ImageRenderer from "./ImageRenderer";

type PopulatedItem = {
  _id: string;
  name: string;
  image: string | null;
  contentType: string; // "Product", "Collection", "Category", "Brand", "Promotion", "Menu"
};

type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  ctaUrl?: string;
  ctaText?: string;
  type: string;
  display: string;
  position?: "left" | "center" | "right" | "full";
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  populatedContent?: PopulatedItem[];
  content: string[];
};

type MenuRendererProps = {
  location: string;
  className?: string;
  depth?: number;
};

// Simple slugify for product titles
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function MenuRenderer({
  location,
  className = "",
  depth = 0,
}: MenuRendererProps) {
  const { success, data, error } = await getMenusByLocation(location);
  console.log("data", data);

  if (!success || !data || data.length === 0) {
    return (
      <div className="text-gray-500 p-4 text-center">
        No menus found for location: <strong>{location}</strong>
      </div>
    );
  }

  return (
    <div className={`menu-location-${location} ${className}`}>
      {data.map((menu: MenuItem) => (
        <MenuNode key={menu._id} menu={menu} depth={depth} />
      ))}
    </div>
  );
}

function MenuNode({ menu, depth }: { menu: MenuItem; depth: number }) {
  const {
    name,
    description,
    image,
    ctaUrl,
    ctaText,
    type,
    display,
    position,
    columns = 4,
    maxDepth = 5,
    showImages = false,
    backgroundColor,
    backgroundImage,
    isSticky,
    sectionTitle,
    populatedContent = [],
    content,
  } = menu;

  if (depth > maxDepth) return null;

  const style: React.CSSProperties = {};
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (backgroundImage) style.backgroundImage = `url(${backgroundImage})`;

  const renderFallback = () => {
    if (ctaUrl) {
      return (
        <Link
          href={ctaUrl}
          className="menu-fallback-link text-blue-600 hover:underline"
        >
          {ctaText || "Go to link"}
        </Link>
      );
    }
    return <p className="text-sm text-gray-400">No content available</p>;
  };

  // Build the href for an item based on its contentType
  const getItemHref = (item: PopulatedItem) => {
    if (item.contentType === "Product") {
      // Product link: /[slugified-title]/details/[id]
      const slug = slugify(item.name);
      return `/${slug}/details/${item._id}`;
    }
    // Non-product: /[menu-type]/[id]
    return `/${type.toLowerCase()}/${item._id}`;
  };

  const renderContent = () => {
    const hasContent = populatedContent && populatedContent.length > 0;

    console.log("hasContent", hasContent);

    if (!hasContent) {
      return renderFallback();
    }

    switch (display) {
      case "List":
        return (
          <ul className="menu-list space-y-1">
            {populatedContent.map((item) => (
              <li key={item._id} className="flex items-center gap-2">
                {showImages && item.image && (
                  <ImageRenderer image={item.image} alt={item.image} />
                )}
                <Link href={getItemHref(item)} className="hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        );

      case "Grid":
        return (
          <div
            className={`menu-grid grid gap-4`}
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {populatedContent.map((item) => (
              <div key={item._id} className="menu-grid-item border p-2 rounded">
                {showImages && item.image && (
                  <ImageRenderer image={item.image} alt={item.image} />
                )}
                <Link
                  href={getItemHref(item)}
                  className="block text-center hover:underline"
                >
                  {item.name}
                </Link>
              </div>
            ))}
          </div>
        );

      case "Carousel":
        return (
          <div className="menu-carousel flex overflow-x-auto gap-4 p-2 scroll-smooth">
            {populatedContent.map((item) => (
              <div
                key={item._id}
                className="carousel-slide min-w-[200px] flex-shrink-0 border p-2 rounded"
              >
                {showImages && item.image && (
                  <ImageRenderer image={item.image} alt={item.image} />
                )}
                <Link
                  href={getItemHref(item)}
                  className="block text-center hover:underline"
                >
                  {item.name}
                </Link>
              </div>
            ))}
          </div>
        );

      case "Dropdown":
        return (
          <div className="menu-dropdown relative group inline-block">
            <button className="dropdown-trigger px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">
              {name}
            </button>
            <div className="dropdown-content absolute left-0 mt-1 hidden group-hover:block bg-white shadow-lg rounded p-2 min-w-[150px] z-10">
              {populatedContent.map((item) => (
                <Link
                  key={item._id}
                  href={getItemHref(item)}
                  className="block px-4 py-2 hover:bg-gray-100 rounded"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        );

      case "MegaMenu":
        return (
          <div
            className={`mega-menu grid gap-4 p-4 bg-gray-50 rounded ${
              position === "full" ? "w-full" : ""
            }`}
            style={{
              gridTemplateColumns: `repeat(${columns || 4}, 1fr)`,
            }}
          >
            {populatedContent.map((child: any) => (
              <MenuNode
                key={child._id}
                menu={child.fullData}
                depth={depth + 1}
              />
            ))}
          </div>
        );

      default:
        return (
          <div className="text-yellow-600">Unknown display type: {display}</div>
        );
    }
  };

  return (
    <div
      className={`menu-node depth-${depth} p-4 my-2 rounded shadow-sm ${
        isSticky ? "sticky top-0 z-50" : ""
      }`}
      style={style}
    >
      {sectionTitle && (
        <h2 className="menu-section-title text-xl font-semibold mb-2">
          {sectionTitle}
        </h2>
      )}

      {image && (
        <img
          src={image}
          alt={name}
          className="menu-icon w-8 h-8 object-cover inline-block mr-2"
        />
      )}

      {ctaUrl && ctaText && populatedContent.length > 0 && (
        <Link
          href={ctaUrl}
          className="menu-cta inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition ml-2"
        >
          {ctaText}
        </Link>
      )}

      <div className="menu-content">{renderContent()}</div>
    </div>
  );
}
