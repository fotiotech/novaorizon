// components/content/blocks/BlockSection.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { CarouselRail } from "@/components/content/Carousel";
import type {
  ResolvedBlock,
  ResolvedDisplayConfig,
  NormalizedContentItem,
} from "@/lib/content/types";
import type {
  BlockCardStyle,
  CardRatio,
  CardShape,
  CardSize,
  CardLayout,
  ImagePosition,
  TitlePosition,
} from "@/lib/content/constants";

interface SharedCardProps {
  size: CardSize;
  cardStyle: BlockCardStyle;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  variant: "card" | "bare";
  shape: CardShape;
  ratio: CardRatio;
  layout: CardLayout;
  titlePosition: TitlePosition;
  imagePosition: ImagePosition;
  textColor?: string;
}

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
  "9:21": "aspect-[9/21]",
  "1:2": "aspect-[1/2]",
  "9:16": "aspect-[9/16]",
  "2:3": "aspect-[2/3]",
  "3:4": "aspect-[3/4]",
  "4:5": "aspect-[4/5]",
  "1:1": "aspect-square",
  "5:4": "aspect-[5/4]",
  "4:3": "aspect-[4/3]",
  "3:2": "aspect-[3/2]",
  "16:9": "aspect-[16/9]",
  "2:1": "aspect-[2/1]",
  "21:9": "aspect-[21/9]",
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

function buildCardProps(
  dc: ResolvedDisplayConfig,
  ss: ResolvedBlock["block"]["sourceStyles"],
): SharedCardProps {
  return {
    size: dc.cardSize,
    cardStyle: dc.cardStyle,
    borderless: dc.borderless,
    rounded: dc.rounded,
    shadow: dc.shadow,
    variant: (ss.manualCardVariant as "card" | "bare") ?? "card",
    shape: dc.cardShape,
    ratio: dc.cardRatio,
    layout: dc.cardLayout,
    titlePosition: dc.titlePosition,
    imagePosition: dc.imagePosition,
    textColor: dc.textColor || undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*                       Editorial layouts (no banners)                       */
/* -------------------------------------------------------------------------- */

function SlidesLayout({
  items,
  dc,
}: {
  items: NormalizedContentItem[];
  dc: ResolvedDisplayConfig;
}) {
  const ratioCls = RATIO_CLS[dc.cardRatio] ?? RATIO_CLS["4:5"];

  return (
    <div
      className="flex snap-x snap-mandatory overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: `${dc.gap}px` }}
    >
      {items.map((it) => (
        <Link
          key={`${it.contentType}:${it._id}`}
          href={it.href}
          className={
            "group relative w-[85%] shrink-0 snap-start overflow-hidden bg-neutral-900 sm:w-[420px] " +
            ratioCls +
            " " +
            (dc.rounded ? "rounded-2xl" : "")
          }
        >
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.image}
              alt={it.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
            {it.badge ? (
              <span className="mb-2 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                {it.badge}
              </span>
            ) : null}
            <p className="line-clamp-2 text-lg font-semibold sm:text-xl">
              {it.name}
            </p>
            {it.subline ? (
              <p className="mt-1 line-clamp-1 text-xs text-white/80">
                {it.subline}
              </p>
            ) : null}
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
              Explore <span aria-hidden>→</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BentoLayout({
  items,
  dc,
}: {
  items: NormalizedContentItem[];
  dc: ResolvedDisplayConfig;
}) {
  const tiles = items.slice(0, 5);

  return (
    <div
      className="grid auto-rows-[150px] grid-cols-2 md:auto-rows-[190px] md:grid-cols-4"
      style={{ gap: `${dc.gap}px` }}
    >
      {tiles.map((it, index) => {
        const isFeature = index === 0;
        return (
          <Link
            key={`${it.contentType}:${it._id}`}
            href={it.href}
            className={
              "group relative overflow-hidden bg-neutral-900 " +
              (isFeature ? "col-span-2 row-span-2 " : "") +
              (dc.rounded ? "rounded-2xl" : "")
            }
          >
            {it.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.image}
                alt={it.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p
                className={
                  "line-clamp-2 font-semibold " +
                  (isFeature ? "text-xl sm:text-2xl" : "text-sm sm:text-base")
                }
              >
                {it.name}
              </p>
              {isFeature && it.subline ? (
                <p className="mt-1 line-clamp-2 text-xs text-white/80">
                  {it.subline}
                </p>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MasonryLayout({
  items,
  cardProps,
}: {
  items: NormalizedContentItem[];
  cardProps: SharedCardProps;
}) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map((it) => (
        <div
          key={`${it.contentType}:${it._id}`}
          className="mb-3 break-inside-avoid"
        >
          <ContentCard item={it} {...cardProps} />
        </div>
      ))}
    </div>
  );
}

function CardBlock({ data }: { data: ResolvedBlock }) {
  const { block, items } = data;
  const dc = block.displayConfig;
  const ss = block.sourceStyles;

  if (items.length === 0) return null;

  return (
    <section
      className={`m-1 p-2 lg:mx-6 lg:p-3 bg-background rounded-xl ${themeWrapCls(dc.theme)}`}
      style={sectionStyle(dc)}
    >
      <div>
        <SectionHeading data={data} />
        {renderCardBody(block.display, items, dc, ss)}
      </div>
    </section>
  );
}

export function BlockSection({ data }: { data: ResolvedBlock }) {
  return <CardBlock data={data} />;
}

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
          cardStyle={dc.cardStyle}
          borderless={dc.borderless}
          rounded={dc.rounded}
          shadow={dc.shadow}
          textColor={cardProps.textColor}
        />
      );

    case "hero":
      return <HeroLayout items={items} gap={dc.gap} cardProps={cardProps} />;

    case "slides":
      return <SlidesLayout items={items} dc={dc} />;

    case "bento":
      return <BentoLayout items={items} dc={dc} />;

    case "masonry":
      return <MasonryLayout items={items} cardProps={cardProps} />;

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
  cardStyle,
  borderless,
  rounded,
  shadow,
  textColor,
}: {
  items: NormalizedContentItem[];
  gap: number;
  cardShape: CardShape;
  cardStyle: BlockCardStyle;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  textColor?: string;
}) {
  if (cardStyle === "tile") {
    return (
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
        style={{ gap: `${gap}px` }}
      >
        {items.map((it) => (
          <ContentCard
            key={`${it.contentType}:${it._id}`}
            item={it}
            cardStyle="tile"
            borderless={borderless}
            rounded={rounded}
            shadow={shadow}
            textColor={textColor}
          />
        ))}
      </div>
    );
  }

  const imgRounding = cardShape === "circle" ? "rounded-full" : "rounded-lg";
  const rowSurface = [
    rounded ? "rounded-lg" : "rounded-none",
    borderless ? "" : "border border-border",
    shadow ? "shadow-sm" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const textStyle = textColor ? { color: textColor } : undefined;
  return (
    <div className="flex flex-col" style={{ gap: `${gap}px` }}>
      {items.map((it) => (
        <Link
          key={`${it.contentType}:${it._id}`}
          href={it.href}
          className={`flex items-center gap-4 bg-card p-3 transition hover:border-primary ${rowSurface}`}
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
