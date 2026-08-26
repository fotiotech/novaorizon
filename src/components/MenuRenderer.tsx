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

  const getItemHref = (item: PopulatedItem) => {
    if (item.contentType === "Product") {
      const slug = slugify(item.name);
      return `/${slug}/details/${item._id}`;
    }
    return `/${type.toLowerCase()}/${item._id}`;
  };

  const getGridCols = () => {
    const cols = Math.min(columns || 4, 6);
    if (cols === 1) return "grid-cols-1";
    const colMap: Record<number, string> = {
      2: "grid-cols-2",
      3: "grid-cols-2 md:grid-cols-3",
      4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
      5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    };
    return colMap[cols] || colMap[4];
  };

  const renderContent = () => {
    const hasContent = populatedContent && populatedContent.length > 0;

    if (!hasContent) {
      return renderFallback();
    }

    switch (display) {
      case "List":
        return (
          <ul className="menu-list space-y-2">
            {populatedContent.map((item) => (
              <li key={item._id} className="flex items-center gap-3">
                {showImages && item.image && (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <Link
                  href={getItemHref(item)}
                  className="hover:underline line-clamp-2"
                  title={item.name}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        );

      case "Grid":
        return (
          <div className={`menu-grid grid gap-4 ${getGridCols()}`}>
            {populatedContent.map((item) => (
              <div key={item._id} className="menu-grid-item border p-2 rounded">
                {showImages && item.image && (
                  <div className="relative w-full aspect-square mb-2">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <Link
                  href={getItemHref(item)}
                  className="block text-center hover:underline line-clamp-2"
                  title={item.name}
                >
                  {item.name}
                </Link>
              </div>
            ))}
          </div>
        );

      case "Carousel":
        return (
          <div className="menu-carousel flex overflow-x-auto gap-4 p-2 scroll-smooth snap-x snap-mandatory">
            {populatedContent.map((item) => (
              <div
                key={item._id}
                className="carousel-slide min-w-[180px] sm:min-w-[220px] md:min-w-[280px] flex-shrink-0 snap-start border p-2 rounded"
              >
                {showImages && item.image && (
                  <div className="relative w-full aspect-square mb-2">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <Link
                  href={getItemHref(item)}
                  className="block text-center hover:underline line-clamp-2"
                  title={item.name}
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
            <button className="dropdown-trigger px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition w-full sm:w-auto">
              {name}
            </button>
            <div className="dropdown-content absolute left-0 mt-1 hidden group-hover:block group-focus-within:block bg-white shadow-lg rounded p-2 min-w-[150px] z-10 w-full sm:w-auto">
              {populatedContent.map((item) => (
                <Link
                  key={item._id}
                  href={getItemHref(item)}
                  className="block px-4 py-2 hover:bg-gray-100 rounded line-clamp-2"
                  title={item.name}
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
            className={`mega-menu grid gap-4 p-4 bg-gray-50 rounded ${getGridCols()} ${
              position === "full" ? "w-full" : ""
            }`}
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
      } `}
      style={style}
    >
      <div className="flex justify-between items-center">
        {sectionTitle && (
          <h2 className="menu-section-title text-xl font-semibold mb-2 line-clamp-1">
            {sectionTitle}
          </h2>
        )}

        {image && (
          <div className="relative w-8 h-8 inline-block mr-2">
            <ImageRenderer image={image} alt={name} className="rounded-full" />
          </div>
        )}

        {ctaUrl && ctaText && populatedContent.length > 0 && (
          <Link
            href={ctaUrl}
            className="menu-cta inline-block text-blue-500 px-4 py-2 rounded hover:text-blue-600 transition ml-2"
          >
            {ctaText}
          </Link>
        )}
      </div>

      <div className="menu-content">{renderContent()}</div>
    </div>
  );
}
