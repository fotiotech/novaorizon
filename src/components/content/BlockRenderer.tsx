// components/content/BlockRenderer.tsx
import React from "react";
import Link from "next/link";
import { getBlocksByLocation } from "@/app/actions/contentBlock";
import { ContentCard } from "./ContentCard";
import { CarouselRail, type CardOverride } from "./Carousel";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type {
  BlockDisplay,
  BlockDisplayConfig,
  BlockSourceStyles,
  CardShape,
} from "@/lib/content/constants";
import type { ResolveContext } from "@/lib/content/resolve";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface ResolvedBlockShape {
  _id: string;
  name: string;
  sectionTitle?: string;
  display: string;
  columns: number;
  showImages: boolean;
  displayConfig: BlockDisplayConfig;
  sourceType: string;
  sourceStyles?: BlockSourceStyles;
  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  items: NormalizedContentItem[];
}

interface BlockRendererProps {
  location: string;
  context?: ResolveContext;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*                        Card override builder                               */
/* -------------------------------------------------------------------------- */

/**
 * Merges block-level `cardShape` (displayConfig) with per-source style
 * overrides (sourceStyles). Result is passed to every layout.
 */
function getCardOverride(block: ResolvedBlockShape): CardOverride {
  const s = block.sourceStyles;
  const shape: CardShape = block.displayConfig.cardShape ?? "default";

  const out: CardOverride = { shape };

  if (block.sourceType === "manual" && s) {
    out.size = s.manualCardSize;
    out.variant = s.manualCardVariant;
  }
  if (block.sourceType === "related" && s) {
    if (s.relatedVariant === "compact") out.size = "sm";
    if (s.relatedVariant === "withScore") out.size = "md";
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*                             Layout primitives                              */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  title,
  ctaText,
  ctaLink,
  ctaStyle,
}: {
  title?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: string;
}) {
  if (!title && !ctaText) return null;

  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      {title ? (
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
      ) : (
        <span />
      )}
      {ctaText && ctaLink ? (
        ctaStyle === "button" ? (
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {ctaText}
          </Link>
        ) : ctaStyle === "none" ? null : (
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
          >
            {ctaText}
            <span aria-hidden>→</span>
          </Link>
        )
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Layouts                                    */
/* -------------------------------------------------------------------------- */

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
};

function GridLayout({
  items,
  columns,
  showImages,
  gap,
  cardOverride,
}: {
  items: NormalizedContentItem[];
  columns: number;
  showImages: boolean;
  gap: number;
  cardOverride?: CardOverride;
}) {
  const cols = GRID_COLS[columns] ?? GRID_COLS[4];
  return (
    <div className={`grid ${cols}`} style={{ gap: `${gap}px` }}>
      {items.map((item) => (
        <ContentCard
          key={`${item.contentType}:${item._id}`}
          item={item}
          showImage={showImages}
          size={cardOverride?.size}
          variant={cardOverride?.variant}
          shape={cardOverride?.shape}
        />
      ))}
    </div>
  );
}

function ListLayout({
  items,
  showImages,
  gap,
  cardOverride,
}: {
  items: NormalizedContentItem[];
  showImages: boolean;
  gap: number;
  cardOverride?: CardOverride;
}) {
  const isCircle = cardOverride?.shape === "circle";
  return (
    <div className="flex flex-col" style={{ gap: `${gap}px` }}>
      {items.map((item) => (
        <Link
          key={`${item.contentType}:${item._id}`}
          href={item.href}
          className="group flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition hover:border-primary hover:shadow-sm"
        >
          {showImages && item.image ? (
            <div
              className={`h-16 w-16 shrink-0 overflow-hidden bg-muted ${
                isCircle ? "rounded-full" : "rounded-lg"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">
              {item.name}
            </p>
            {item.description ? (
              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
            {item.subline ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.subline}
              </p>
            ) : null}
          </div>
          {item.badge ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function HeroLayout({
  items,
  showImages,
  gap,
  cardOverride,
}: {
  items: NormalizedContentItem[];
  showImages: boolean;
  gap: number;
  cardOverride?: CardOverride;
}) {
  if (!items.length) return null;
  const [first, ...rest] = items;

  return (
    <div className="grid gap-4 lg:grid-cols-3" style={{ gap: `${gap}px` }}>
      <Link
        href={first.href}
        className="group relative col-span-1 overflow-hidden rounded-2xl bg-muted lg:col-span-2"
      >
        {showImages && first.image ? (
          <div className="aspect-[16/9] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={first.image}
              alt={first.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">
            {first.name}
          </h3>
          {first.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-white/80">
              {first.description}
            </p>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-col gap-4 lg:col-span-1">
        {rest.slice(0, 2).map((item) => (
          <ContentCard
            key={`${item.contentType}:${item._id}`}
            item={item}
            showImage={showImages}
            size="sm"
            shape={cardOverride?.shape}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 BlockShell                                 */
/* -------------------------------------------------------------------------- */

function BlockShell({
  block,
  children,
}: {
  block: ResolvedBlockShape;
  children: React.ReactNode;
}) {
  const cfg = block.displayConfig;
  const themeCls =
    cfg.theme === "dark"
      ? "bg-neutral-900 text-neutral-100"
      : cfg.theme === "light"
        ? "bg-white text-neutral-900"
        : "";

  return (
    <section
      className={`py-8 ${themeCls}`}
      style={{
        backgroundColor: block.backgroundColor,
        backgroundImage: block.backgroundImage
          ? `url(${block.backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <SectionHeading
        title={block.sectionTitle}
        ctaText={block.ctaText}
        ctaLink={block.ctaLink}
        ctaStyle={block.ctaStyle}
      />
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Block dispatcher                               */
/* -------------------------------------------------------------------------- */

function renderLayout(block: ResolvedBlockShape) {
  const { items, display, columns, showImages, displayConfig } = block;
  if (!items.length) return null;

  const gap = displayConfig?.gap ?? 16;
  const cardOverride = getCardOverride(block);

  switch (display as BlockDisplay) {
    case "carousel":
      return (
        <CarouselRail
          items={items}
          showImages={showImages}
          gap={gap}
          cardOverride={cardOverride}
        />
      );
    case "list":
      return (
        <ListLayout
          items={items}
          showImages={showImages}
          gap={gap}
          cardOverride={cardOverride}
        />
      );
    case "hero":
      return (
        <HeroLayout
          items={items}
          showImages={showImages}
          gap={gap}
          cardOverride={cardOverride}
        />
      );
    case "grid":
    default:
      return (
        <GridLayout
          items={items}
          columns={columns}
          showImages={showImages}
          gap={gap}
          cardOverride={cardOverride}
        />
      );
  }
}

/* -------------------------------------------------------------------------- */
/*                              BlockRenderer                                 */
/* -------------------------------------------------------------------------- */

export default async function BlockRenderer({
  location,
  context,
  className = "",
}: BlockRendererProps) {
  const result = await getBlocksByLocation(location, context);
  if (!result.success || !result.data?.length) return null;

  const blocks = (result.data as ResolvedBlockShape[]).filter(
    (b) => b.items.length > 0,
  );
  if (!blocks.length) return null;

  return (
    <div className={className}>
      {blocks.map((block) => (
        <BlockShell key={block._id} block={block}>
          {renderLayout(block)}
        </BlockShell>
      ))}
    </div>
  );
}
