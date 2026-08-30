// components/menu/MenuRenderer.tsx
import { getMenusByLocation } from "@/app/actions/menu";
import Link from "next/link";
import ImageRenderer from "./ImageRenderer";
import Carousel from "./Carousel";

type Item = {
  _id: string;
  name: string;
  image: string | null;
  price: number | null;
  contentType: string; // "Product", "Collection", "Category", etc.
};

type Menu = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  link?: string;
  ctaText?: string;
  ctaLink?: string;
  collectionId?: string | null;
  location?: string;
  display: string;
  position?: "left" | "center" | "right" | "full";
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  order: number;
  items?: Item[];
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
      {data.map((menu: Menu) => (
        <MenuNode key={menu._id} menu={menu} depth={depth} />
      ))}
    </div>
  );
}

function MenuNode({ menu, depth }: { menu: Menu; depth: number }) {
  const {
    name,
    image,
    link,
    ctaText,
    ctaLink,
    display,
    position,
    columns = 4,
    maxDepth = 5,
    showImages = false,
    backgroundColor,
    backgroundImage,
    isSticky,
    sectionTitle,
    items = [],
  } = menu;

  if (depth > maxDepth) return null;

  const style: React.CSSProperties = {};
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (backgroundImage) style.backgroundImage = `url(${backgroundImage})`;

  const getItemHref = (item: Item) => {
    const slug = slugify(item.name);
    const prefix = item.contentType.toLowerCase() + "s";
    return `/${prefix}/${slug}/${item._id}`;
  };

  const renderFallback = () => {
    if (link) {
      return (
        <Link
          href={link}
          className="menu-fallback-link text-blue-600 hover:underline"
        >
          {name} (Link)
        </Link>
      );
    }
    return <p className="text-sm text-gray-400">No content available</p>;
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
    const hasItems = items && items.length > 0;

    if (!hasItems) {
      return renderFallback();
    }

    switch (display) {
      case "List":
        return (
          <ul className="menu-list space-y-2">
            {items.map((item) => (
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
                  className="hover:underline line-clamp-1"
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
          <div className={`menu-grid grid gap-2 lg:gap-4 ${getGridCols()}`}>
            {items.slice(0, 4).map((item) => (
              <div key={item._id} className="menu-grid-item p-2 rounded">
                {showImages && item.image && (
                  <div className="relative w-full aspect-square mb-2 bg-gray-100">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <Link
                  href={getItemHref(item)}
                  className="block"
                  title={item.name}
                >
                  <p className="line-clamp-2 text-sm">{item.name}</p>
                  {/* <p className="font-semibold text-sm">{item.price} cfa</p> */}
                </Link>
              </div>
            ))}
          </div>
        );

      case "Carousel":
        return (
          <Carousel
            items={items.slice(0, 4).map((item) => ({
              _id: item._id,
              name: item.name,
              image: item.image,
              price: item.price,
              contentType: item.contentType, // ✅ passes contentType
            }))}
            showImages={showImages}
          />
        );

      case "Dropdown":
        return (
          <div className="menu-dropdown relative group inline-block">
            <button className="dropdown-trigger px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition w-full sm:w-auto">
              {name}
            </button>
            <div className="dropdown-content absolute left-0 mt-1 hidden group-hover:block group-focus-within:block bg-white shadow-lg rounded p-2 min-w-[150px] z-10 w-full sm:w-auto">
              {items.map((item) => (
                <Link
                  key={item._id}
                  href={getItemHref(item)}
                  className="block px-4 py-2 hover:bg-gray-100 rounded line-clamp-1"
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
            {items.map((item) => (
              <div key={item._id} className="mega-menu-item">
                {showImages && item.image && (
                  <div className="relative w-full aspect-square mb-2 bg-gray-100">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <Link
                  href={getItemHref(item)}
                  className="block hover:underline"
                  title={item.name}
                >
                  <p className="line-clamp-2 text-sm">{item.name}</p>
                </Link>
              </div>
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
      className={`menu-node depth-${depth} p-2 md:p-4 lg:p-6 my-2 rounded shadow-sm ${
        isSticky ? "sticky top-0 z-50" : ""
      }`}
      style={style}
    >
      <div>
        <div className="flex items-center justify-between">
          {sectionTitle && (
            <h2 className="menu-section-title text-xl font-semibold mb-2 line-clamp-1">
              {sectionTitle}
            </h2>
          )}

          {ctaText && ctaLink && (
            <a href={ctaLink} className="text-primary hover:text-primary-600">
              {ctaText}
            </a>
          )}
        </div>
        {image && (
          <div className="relative w-8 h-8 inline-block mr-2">
            <ImageRenderer image={image} alt={name} className="rounded-full" />
          </div>
        )}
      </div>

      <div className="menu-content">{renderContent()}</div>
    </div>
  );
}
