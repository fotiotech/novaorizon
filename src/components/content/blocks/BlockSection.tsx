// components/content/blocks/BlockSection.tsx
import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { CarouselRail } from "@/components/content/Carousel";
import type {
  ResolvedBlock,
  ResolvedDisplayConfig,
} from "@/lib/content/blocks/resolve";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type { CardShape } from "@/lib/content/constants";

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
};

function themeWrapCls(theme: string): string {
  if (theme === "dark") return "bg-neutral-950 text-white";
  if (theme === "light") return "bg-white";
  return "";
}

function ctaHrefSafe(href: string): string {
  return href || "#";
}

export function BlockSection({ data }: { data: ResolvedBlock }) {
  const { block, items } = data;
  const dc = block.displayConfig;
  const ss = block.sourceStyles;
  const { heading, cta } = block;

  if (items.length === 0) return null;

  const hasHeadingText =
    heading.showHeading && (heading.title || heading.subtitle);
  const hasCta = cta.style !== "none" && cta.text && cta.link;

  return (
    <section className={`py-8 ${themeWrapCls(dc.theme)}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(hasHeadingText || hasCta) && (
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              {hasHeadingText && heading.title && (
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {heading.title}
                </h2>
              )}
              {hasHeadingText && heading.subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {heading.subtitle}
                </p>
              )}
            </div>
            {hasCta &&
              (cta.style === "button" ? (
                <Link
                  href={ctaHrefSafe(cta.link)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {cta.text}
                </Link>
              ) : (
                <Link
                  href={ctaHrefSafe(cta.link)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
                >
                  {cta.text}
                  <span aria-hidden>→</span>
                </Link>
              ))}
          </div>
        )}

        {renderBody(block.display, items, dc, ss)}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Layouts                                      */
/* -------------------------------------------------------------------------- */

function renderBody(
  display: string,
  items: NormalizedContentItem[],
  dc: ResolvedDisplayConfig,
  ss: ResolvedBlock["block"]["sourceStyles"],
) {
  switch (display) {
    case "carousel":
      return (
        <CarouselRail
          items={items}
          showImages={true}
          gap={dc.gap}
          cardOverride={{
            size: ss.manualCardSize as any,
            variant: ss.manualCardVariant as any,
            shape: dc.cardShape,
          }}
        />
      );

    case "list":
      return <ListLayout items={items} gap={dc.gap} cardShape={dc.cardShape} />;

    case "hero":
      return <HeroLayout items={items} cardShape={dc.cardShape} gap={dc.gap} />;

    case "banner":
      return <BannerLayout item={items[0]} />;

    case "grid":
    default:
      return (
        <div
          className={`grid ${GRID_COLS[dc.columns] ?? GRID_COLS[4]}`}
          style={{ gap: `${dc.gap}px` }}
        >
          {items.map((it) => (
            <ContentCard
              key={`${it.contentType}:${it._id}`}
              item={it}
              shape={dc.cardShape}
              size={ss.manualCardSize as any}
              variant={ss.manualCardVariant as any}
            />
          ))}
        </div>
      );
  }
}

function ListLayout({
  items,
  gap,
  cardShape,
}: {
  items: NormalizedContentItem[];
  gap: number;
  cardShape: CardShape;
}) {
  const imgRounding = cardShape === "circle" ? "rounded-full" : "rounded-lg";
  return (
    <div className="flex flex-col" style={{ gap: `${gap}px` }}>
      {items.map((it) => (
        <Link
          key={`${it.contentType}:${it._id}`}
          href={it.href}
          className="flex items-center gap-4 rounded-lg border bg-card p-3 transition hover:border-primary"
        >
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.image}
              alt={it.name}
              className={`h-16 w-16 object-cover ${imgRounding}`}
            />
          ) : (
            <div className={`h-16 w-16 bg-muted ${imgRounding}`} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{it.name}</p>
            {it.description && (
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {it.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function HeroLayout({
  items,
  cardShape,
  gap,
}: {
  items: NormalizedContentItem[];
  cardShape: CardShape;
  gap: number;
}) {
  const [first, ...rest] = items;
  return (
    <div className="grid gap-4 lg:grid-cols-3" style={{ gap: `${gap}px` }}>
      <Link
        href={first.href}
        className="relative col-span-1 overflow-hidden rounded-2xl bg-muted lg:col-span-2"
      >
        {first.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={first.image}
            alt={first.name}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6">
          <h3 className="text-2xl font-bold text-white">{first.name}</h3>
          {first.description && (
            <p className="line-clamp-2 text-sm text-white/80">
              {first.description}
            </p>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-4">
        {rest.slice(0, 2).map((it) => (
          <ContentCard
            key={`${it.contentType}:${it._id}`}
            item={it}
            size="sm"
            shape={cardShape}
          />
        ))}
      </div>
    </div>
  );
}

function BannerLayout({ item }: { item: NormalizedContentItem }) {
  if (!item) return null;
  return (
    <Link
      href={item.href}
      className="relative block overflow-hidden rounded-2xl bg-muted"
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          className="aspect-[21/9] w-full object-cover"
        />
      ) : (
        <div className="aspect-[21/9] w-full" />
      )}
      <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 to-transparent p-8">
        <h3 className="text-2xl font-bold text-white sm:text-3xl">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 max-w-md text-sm text-white/80">
            {item.description}
          </p>
        )}
        {item.badge && (
          <span className="mt-3 w-fit rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default BlockSection;
