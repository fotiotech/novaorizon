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
  listPrice?: number | null;
  contentType?: string | null; // tolerate missing contentType
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
  context?: any;
};

// ------------------------------------------------------------------
// URL helpers
// ------------------------------------------------------------------
const CONTENT_TYPE_PATH: Record<string, string> = {
  Product: "products",
  Category: "categories",
  Brand: "brands",
  Collection: "collections",
  Promotion: "promotions",
  Page: "pages",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getItemHref(item: Item): string {
  const segment =
    CONTENT_TYPE_PATH[item.contentType ?? "Product"] ?? "products";
  const slug = slugify(item.name || "");
  return slug ? `/${segment}/${slug}/${item._id}` : `/${segment}/${item._id}`;
}

// ------------------------------------------------------------------
// Price helpers
// ------------------------------------------------------------------
function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// ------------------------------------------------------------------
// Root
// ------------------------------------------------------------------
export default async function MenuRenderer({
  location,
  className = "",
  depth = 0,
  context,
}: MenuRendererProps) {
  const result = await getMenusByLocation(location, context);

  if (!result.success || !result.data || result.data.length === 0) {
    return <div className="text-gray-500 p-4 text-center" />;
  }

  return (
    <div className={`menu-location-${location} ${className}`}>
      {result.data.map((menu: Menu) => (
        <MenuNode key={menu._id} menu={menu} depth={depth} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
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
    showImages = false,
    backgroundColor,
    backgroundImage,
    isSticky,
    sectionTitle,
    items = [],
  } = menu;

  const style: React.CSSProperties = {};
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (backgroundImage) style.backgroundImage = `url(${backgroundImage})`;

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
    const cols = Math.min(Number(columns) || 4, 6);
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
    if (!items || items.length === 0) {
      return renderFallback();
    }

    switch (display) {
      case "List":
        return (
          <ul className="menu-list space-y-2">
            {items.map((item) => {
              const displayPrice = pickPrice(item.price, item.listPrice);
              const numericListPrice = Number(item.listPrice) || 0;
              const showListPrice =
                numericListPrice > displayPrice && displayPrice > 0;

              return (
                <li key={item._id}>
                  <Link
                    href={getItemHref(item)}
                    className="flex items-center gap-3 rounded p-1 -m-1 hover:bg-muted/40 transition-colors"
                    title={item.name}
                  >
                    {showImages && item.image && (
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <ImageRenderer
                          image={item.image}
                          alt={item.name}
                          className="rounded"
                        />
                      </div>
                    )}
                    <span className="line-clamp-1">{item.name}</span>
                    {displayPrice > 0 && (
                      <span className="ml-auto inline-flex items-baseline gap-1">
                        <span className="font-semibold text-sm">
                          {formatPrice(displayPrice)}
                        </span>
                        {showListPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(numericListPrice)}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        );

      case "Grid":
        return (
          <div className={`menu-grid grid gap-2 lg:gap-4 ${getGridCols()}`}>
            {items.slice(0, 4).map((item) => {
              const displayPrice = pickPrice(item.price, item.listPrice);
              const numericListPrice = Number(item.listPrice) || 0;
              const showListPrice =
                numericListPrice > displayPrice && displayPrice > 0;

              return (
                <Link
                  key={item._id}
                  href={getItemHref(item)}
                  className="menu-grid-item group/card block rounded transition-colors"
                  title={item.name}
                >
                  {showImages && item.image && (
                    <div className="relative w-full aspect-square mb-2 bg-gray-100 overflow-hidden rounded">
                      <ImageRenderer
                        image={item.image}
                        alt={item.name}
                        className="rounded"
                      />
                    </div>
                  )}
                  <p className="line-clamp-2 text-sm ">{item.name}</p>
                  {displayPrice > 0 && (
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-sm">
                        {formatPrice(displayPrice)}
                      </p>
                      {showListPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(numericListPrice)}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        );

      case "Carousel":
        return (
          <Carousel
            items={items.slice(0, 6).map((item) => ({
              _id: item._id,
              name: item.name,
              image: item.image,
              price: item.price,
              listPrice: item.listPrice,
              contentType: item.contentType ?? "Product",
            }))}
            showImages={showImages}
          />
        );

      case "Dropdown":
        return (
          <div className="menu-dropdown relative group inline-block">
            <button
              type="button"
              className="dropdown-trigger px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition w-full sm:w-auto"
            >
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
              <Link
                key={item._id}
                href={getItemHref(item)}
                className="mega-menu-item group/card block p-2 rounded hover:bg-white transition-colors"
                title={item.name}
              >
                {showImages && item.image && (
                  <div className="relative w-full aspect-square mb-2 bg-gray-100 overflow-hidden rounded">
                    <ImageRenderer
                      image={item.image}
                      alt={item.name}
                      className="rounded"
                    />
                  </div>
                )}
                <p className="line-clamp-2 text-sm ">{item.name}</p>
              </Link>
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
      className={`menu-node depth-${depth} px-3 py-2 md:px-6 lg:px-8 my-2 rounded shadow-sm ${
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
