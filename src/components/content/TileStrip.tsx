import Link from "next/link";
import type { Tile } from "@/lib/content/tiles";

/**
 * Compact logo + title shortcuts rendered as a horizontal snap carousel
 * between the hero and the first content block.
 *
 * No arrow controls: the rail scrolls natively (trackpad, touch, wheel).
 */
export function TileStrip({ tiles }: { tiles: Tile[] }) {
  if (!Array.isArray(tiles) || tiles.length === 0) return null;

  return (
    <section className="container mx-auto px-3 py-2 lg:py-6">
      <h2 className="sr-only">Shop by category</h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiles.map((tile) => {
          const hasBackground = !!(
            tile.backgroundColor || tile.backgroundImage
          );
          const href = tile.link || null;

          return (
            <div
              key={tile._id}
              className={`relative flex h-[64px] w-[148px] shrink-0 snap-start items-center justify-center overflow-hidden rounded-xl px-3 py-2 transition hover:shadow-sm sm:h-[68px] sm:w-[172px] ${
                hasBackground
                  ? "rounded-xl"
                  : "rounded-xl border border-border bg-card"
              }`}
              style={{
                backgroundColor: tile.backgroundColor || undefined,
              }}
            >
              {tile.backgroundImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.backgroundImage}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              {hasBackground ? (
                <div className="absolute inset-0 bg-black/30" aria-hidden />
              ) : null}

              <div className="relative z-10 flex min-w-0 items-center gap-2">
                {tile.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-7 w-7 shrink-0 object-contain"
                  />
                ) : null}
                <span
                  className={`line-clamp-2 text-left text-[12px] font-medium ${
                    hasBackground ? "text-white" : "text-foreground"
                  }`}
                >
                  {tile.title}
                </span>
              </div>

              {href ? (
                <Link
                  href={href}
                  aria-label={tile.title}
                  className="absolute inset-0 z-20"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
