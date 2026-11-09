// components/content/blocks/BlockSection.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { CarouselRail } from "@/components/content/Carousel";
import type {
  ResolvedBlock,
  ResolvedDisplayConfig,
  ResolvedBanner,
} from "@/lib/content/blocks/resolve";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type {
  CardRatio,
  CardShape,
  CardSize,
  ImagePosition,
  TitlePosition,
} from "@/lib/content/constants";

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
};

const IMG_POS_CLS: Record<ImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

const RATIO_CLS: Record<CardRatio, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
  "3:2": "aspect-[3/2]",
  "2:3": "aspect-[2/3]",
};

function themeWrapCls(theme: string): string {
  if (theme === "dark") return "bg-neutral-950 text-white";
  if (theme === "light") return "bg-white";
  return "";
}

function ctaHrefSafe(href: string): string {
  return href || "#";
}

function sectionStyle(dc: ResolvedDisplayConfig): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (dc.backgroundColor) style.backgroundColor = dc.backgroundColor;
  if (dc.textColor) style.color = dc.textColor;
  return style;
}

/* -------------------------------------------------------------------------- */
/*                              Section header                                */
/* -------------------------------------------------------------------------- */

function SectionHeading({ data }: { data: ResolvedBlock }) {
  const { block } = data;
  const hasTitle = block.heading.title;
  const hasSubtitle = block.heading.subtitle;
  const cta = block.cta;
  const hasCta = cta.style !== "none" && Boolean(cta.link);

  if (!block.heading.showHeading && !hasCta) return null;
  if (!hasTitle && !hasSubtitle && !hasCta) return null;

  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {hasTitle && (
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {block.heading.title}
          </h2>
        )}
        {hasSubtitle && (
          <p className="mt-1 text-sm text-muted-foreground">
            {block.heading.subtitle}
          </p>
        )}
      </div>
      {hasCta &&
        (cta.style === "button" ? (
          cta.text ? (
            <Link
              href={ctaHrefSafe(cta.link)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {cta.text}
            </Link>
          ) : (
            <Link
              href={ctaHrefSafe(cta.link)}
              aria-label="Open link"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          )
        ) : (
          <Link
            href={ctaHrefSafe(cta.link)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
          >
            {cta.text || "Learn more"}
            <span aria-hidden>→</span>
          </Link>
        ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Banner slide                                    */
/* -------------------------------------------------------------------------- */

function BannerSlide({
  banner,
  dc,
}: {
  banner: ResolvedBanner;
  dc: ResolvedDisplayConfig;
}) {
  const imgPos = IMG_POS_CLS[dc.imagePosition] ?? IMG_POS_CLS.center;
  const paragraphs = banner.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  const cta = banner.cta;
  const hasCta = cta.style !== "none" && Boolean(cta.link);

  return (
    <div
      className={`relative h-full overflow-hidden ${
        dc.rounded ? "rounded-2xl" : ""
      }`}
    >
      {banner.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image}
            alt={banner.heading.title || banner.name}
            className={`aspect-[21/9] w-full object-cover ${imgPos}`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
        </>
      ) : (
        <div className="aspect-[21/9] w-full bg-neutral-900" />
      )}

      <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 lg:p-16">
        <div className="max-w-2xl text-white [&_*]:text-white">
          {banner.eyebrow && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              {banner.eyebrow}
            </p>
          )}
          {banner.heading.title && (
            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {banner.heading.title}
            </h2>
          )}
          {banner.heading.subtitle && (
            <p className="mt-3 text-base text-white/80 sm:text-lg">
              {banner.heading.subtitle}
            </p>
          )}
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base"
            >
              {p}
            </p>
          ))}
          {hasCta && (
            <div className="mt-6">
              {cta.style === "button" ? (
                cta.text ? (
                  <Link
                    href={ctaHrefSafe(cta.link)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {cta.text}
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <Link
                    href={ctaHrefSafe(cta.link)}
                    aria-label="Open link"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              ) : (
                <Link
                  href={ctaHrefSafe(cta.link)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
                >
                  {cta.text || "Learn more"}
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Banner display — carousel                         */
/* -------------------------------------------------------------------------- */

function BannerDisplay({ data }: { data: ResolvedBlock }) {
  const { block, banners = [] } = data;
  const dc = block.displayConfig;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  if (banners.length === 0) return null;

  const total = banners.length;
  const current = banners[Math.min(index, total - 1)];

  return (
    <section
      className={`py-4 ${themeWrapCls(dc.theme)}`}
      style={sectionStyle(dc)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading data={data} />

        <div className="relative">
          <BannerSlide banner={current} dc={dc} />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((index - 1 + total) % total)}
                aria-label="Previous banner"
                className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIndex((index + 1) % total)}
                aria-label="Next banner"
                className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {banners.map((b, i) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to banner ${i + 1}`}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      i === index
                        ? "scale-125 bg-white shadow-lg"
                        : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Card-based displays                               */
/* -------------------------------------------------------------------------- */

interface SharedCardProps {
  size: CardSize;
  variant: "card" | "bare";
  shape: CardShape;
  ratio: CardRatio;
  titlePosition: TitlePosition;
  imagePosition: ImagePosition;
  textColor: string | undefined;
}

function buildCardProps(
  dc: ResolvedDisplayConfig,
  ss: ResolvedBlock["block"]["sourceStyles"],
): SharedCardProps {
  return {
    size: dc.cardSize,
    variant: (ss.manualCardVariant as "card" | "bare") ?? "card",
    shape: dc.cardShape,
    ratio: dc.cardRatio,
    titlePosition: dc.titlePosition,
    imagePosition: dc.imagePosition,
    textColor: dc.textColor || undefined,
  };
}

function CardBlock({ data }: { data: ResolvedBlock }) {
  const { block, items } = data;
  const dc = block.displayConfig;
  const ss = block.sourceStyles;

  if (items.length === 0) return null;

  return (
    <section
      className={`py-4 ${themeWrapCls(dc.theme)}`}
      style={sectionStyle(dc)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading data={data} />
        {renderCardBody(block.display, items, dc, ss)}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Public dispatcher                                 */
/* -------------------------------------------------------------------------- */

export function BlockSection({ data }: { data: ResolvedBlock }) {
  if (data.block.display === "banner" && data.banners) {
    return <BannerDisplay data={data} />;
  }
  return <CardBlock data={data} />;
}

/* -------------------------------------------------------------------------- */
/*                               Card layouts                                 */
/* -------------------------------------------------------------------------- */

function renderCardBody(
  display: string,
  items: NormalizedContentItem[],
  dc: ResolvedDisplayConfig,
  ss: ResolvedBlock["block"]["sourceStyles"],
) {
  const cardProps = buildCardProps(dc, ss);

  switch (display) {
    case "carousel":
      return (
        <CarouselRail
          items={items}
          showImages={true}
          gap={dc.gap}
          cardOverride={cardProps}
        />
      );

    case "list":
      return (
        <ListLayout
          items={items}
          gap={dc.gap}
          cardShape={dc.cardShape}
          textColor={cardProps.textColor}
        />
      );

    case "hero":
      return <HeroLayout items={items} gap={dc.gap} cardProps={cardProps} />;

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
              {...cardProps}
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
  textColor,
}: {
  items: NormalizedContentItem[];
  gap: number;
  cardShape: CardShape;
  textColor?: string;
}) {
  const imgRounding = cardShape === "circle" ? "rounded-full" : "rounded-lg";
  const textStyle = textColor ? { color: textColor } : undefined;
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
              alt=""
              className={`h-16 w-16 object-cover ${imgRounding}`}
            />
          ) : (
            <div className={`h-16 w-16 bg-muted ${imgRounding}`} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold" style={textStyle}>
              {it.name}
            </p>
            {it.description && (
              <p
                className="line-clamp-1 text-sm text-muted-foreground"
                style={textStyle}
              >
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
  gap,
  cardProps,
}: {
  items: NormalizedContentItem[];
  gap: number;
  cardProps: SharedCardProps;
}) {
  const [first, ...rest] = items;
  const imgPos = IMG_POS_CLS[cardProps.imagePosition] ?? IMG_POS_CLS.center;
  const ratioCls = RATIO_CLS[cardProps.ratio] ?? RATIO_CLS["1:1"];
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
            alt=""
            className={`${ratioCls} w-full object-cover ${imgPos}`}
          />
        ) : (
          <div className={`${ratioCls} w-full`} />
        )}
      </Link>
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {rest.slice(0, 2).map((it) => (
          <ContentCard
            key={`${it.contentType}:${it._id}`}
            item={it}
            {...cardProps}
          />
        ))}
      </div>
    </div>
  );
}

export default BlockSection;
