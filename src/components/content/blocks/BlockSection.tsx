// components/content/blocks/BlockSection.tsx
import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { CarouselRail } from "@/components/content/Carousel";
import type {
  ResolvedBlock,
  ResolvedDisplayConfig,
} from "@/lib/content/blocks/resolve";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import {
  isFeatureDisplay,
  type CardRatio,
  type CardShape,
  type CardSize,
  type ImagePosition,
  type TitlePosition,
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

const SIZE_TEXT: Record<
  CardSize,
  { heading: string; subtitle: string; body: string; eyebrow: string }
> = {
  sm: {
    heading: "text-xl sm:text-2xl",
    subtitle: "text-sm sm:text-base",
    body: "text-sm",
    eyebrow: "text-[10px]",
  },
  md: {
    heading: "text-2xl sm:text-3xl lg:text-4xl",
    subtitle: "text-base sm:text-lg",
    body: "text-sm sm:text-base",
    eyebrow: "text-[11px]",
  },
  lg: {
    heading: "text-3xl sm:text-4xl lg:text-5xl",
    subtitle: "text-lg sm:text-xl",
    body: "text-base sm:text-lg",
    eyebrow: "text-xs",
  },
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

function SectionHeading({
  data,
  align = "left",
}: {
  data: ResolvedBlock;
  align?: "left" | "center";
}) {
  const { block, editorial } = data;
  const dc = block.displayConfig;
  const sizeText = SIZE_TEXT.sm;
  const hasEyebrow = editorial?.eyebrow;
  const hasTitle = block.heading.title;
  const hasSubtitle = block.heading.subtitle;
  const cta = block.cta;
  const hasCta = cta.style !== "none" && cta.text && cta.link;

  if (!hasEyebrow && !hasTitle && !hasSubtitle && !hasCta) return null;

  const alignCls = align === "center" ? "text-center" : "";
  const ctaAlignCls = align === "center" ? "mx-auto" : "";

  return (
    <div
      className={`mb-6 ${
        align === "center"
          ? "flex flex-col items-center"
          : "flex items-end justify-between gap-4"
      }`}
    >
      <div className={alignCls}>
        {hasEyebrow && (
          <p
            className={`mb-3 font-semibold uppercase tracking-[0.16em] text-muted-foreground ${sizeText.eyebrow}`}
          >
            {editorial!.eyebrow}
          </p>
        )}
        {hasTitle && (
          <h2 className={`font-bold tracking-tight ${sizeText.heading}`}>
            {block.heading.title}
          </h2>
        )}
        {hasSubtitle && (
          <p className={`mt-1 text-muted-foreground ${sizeText.subtitle}`}>
            {block.heading.subtitle}
          </p>
        )}
      </div>
      {hasCta && (
        <div className={ctaAlignCls}>
          {cta.style === "button" ? (
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
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Feature editorial renderer                        */
/* -------------------------------------------------------------------------- */

function FeatureEditorialSection({ data }: { data: ResolvedBlock }) {
  if (!data.editorial) return null;
  const { block, editorial } = data;
  const dc = block.displayConfig;
  const imgPos = IMG_POS_CLS[dc.imagePosition] ?? IMG_POS_CLS.center;
  const rounded = dc.rounded ? "rounded-2xl" : "";
  const ratioCls = RATIO_CLS[dc.cardRatio] ?? RATIO_CLS["4:3"];
  const sizeText = SIZE_TEXT[dc.cardSize] ?? SIZE_TEXT.sm;
  const gapStyle = { gap: `${dc.gap}px` };
  const display = block.display;

  const eyebrowNode = editorial.eyebrow ? (
    <p
      className={`mb-3 font-semibold uppercase tracking-[0.16em] text-muted-foreground ${sizeText.eyebrow}`}
    >
      {editorial.eyebrow}
    </p>
  ) : null;

  const headlineNode = block.heading.title ? (
    <h2
      className={`font-bold leading-tight tracking-tight ${sizeText.heading}`}
    >
      {block.heading.title}
    </h2>
  ) : null;

  const subtitleNode = block.heading.subtitle ? (
    <p className={`mt-3 text-muted-foreground ${sizeText.subtitle}`}>
      {block.heading.subtitle}
    </p>
  ) : null;

  const paragraphs = editorial.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyNode =
    paragraphs.length > 0 ? (
      <div
        className={`mt-5 space-y-3 leading-relaxed text-muted-foreground ${sizeText.body}`}
      >
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    ) : null;

  const cta = block.cta;
  const hasCta = cta.style !== "none" && cta.text && cta.link;
  const ctaNode = hasCta ? (
    cta.style === "button" ? (
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
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
      >
        {cta.text}
        <span aria-hidden>→</span>
      </Link>
    )
  ) : null;

  /* ────── banner ─────────────────────────────────────── */
  if (display === "banner") {
    return (
      <section
        className={`py-8 ${themeWrapCls(dc.theme)}`}
        style={sectionStyle(dc)}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`relative overflow-hidden ${
              dc.rounded ? "rounded-2xl" : ""
            }`}
          >
            {editorial.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editorial.image}
                  alt={block.heading.title || ""}
                  className={`${ratioCls} w-full object-cover ${imgPos}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              </>
            ) : (
              <div className={`${ratioCls} w-full bg-neutral-900`} />
            )}
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10">
              <div
                className="max-w-lg text-white [&_*]:text-white"
                style={gapStyle}
              >
                {eyebrowNode}
                {headlineNode}
                {subtitleNode}
                {hasCta && <div className="mt-5">{ctaNode}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ────── feature-split-left / feature-split-right ────── */
  if (display === "feature-split-left" || display === "feature-split-right") {
    const imageFirst = display === "feature-split-left";

    const imageCol = (
      <div className="relative">
        {editorial.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={editorial.image}
            alt={block.heading.title || ""}
            className={`${ratioCls} w-full object-cover ${imgPos} ${rounded}`}
          />
        ) : (
          <div className={`${ratioCls} w-full bg-muted ${rounded}`} />
        )}
      </div>
    );

    const textCol = (
      <div className="flex items-center">
        <div>
          {eyebrowNode}
          {headlineNode}
          {subtitleNode}
          {bodyNode}
          {hasCta && <div className="mt-6">{ctaNode}</div>}
        </div>
      </div>
    );

    return (
      <section
        className={`py-10 sm:py-14 ${themeWrapCls(dc.theme)}`}
        style={sectionStyle(dc)}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center lg:grid-cols-2" style={gapStyle}>
            {imageFirst ? (
              <>
                {imageCol}
                {textCol}
              </>
            ) : (
              <>
                {textCol}
                {imageCol}
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ────── feature-overlay ────────────────────────────── */
  if (display === "feature-overlay") {
    return (
      <section
        className={`py-8 ${themeWrapCls(dc.theme)}`}
        style={sectionStyle(dc)}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`relative overflow-hidden ${
              dc.rounded ? "rounded-2xl" : ""
            }`}
          >
            {editorial.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editorial.image}
                  alt={block.heading.title || ""}
                  className={`${ratioCls} w-full object-cover ${imgPos}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
              </>
            ) : (
              <div className={`${ratioCls} w-full bg-neutral-900`} />
            )}
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 lg:p-16">
              <div
                className="max-w-2xl text-white [&_*]:text-white"
                style={gapStyle}
              >
                {eyebrowNode}
                {headlineNode}
                {subtitleNode}
                {bodyNode && (
                  <div className="[&_p]:text-white/80 [&_p]:text-sm [&_p]:sm:text-base">
                    {bodyNode}
                  </div>
                )}
                {hasCta && <div className="mt-6">{ctaNode}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ────── feature-stacked ────────────────────────────── */
  if (display === "feature-stacked") {
    return (
      <section
        className={`py-10 sm:py-14 ${themeWrapCls(dc.theme)}`}
        style={sectionStyle(dc)}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col" style={gapStyle}>
            {editorial.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={editorial.image}
                alt={block.heading.title || ""}
                className={`${ratioCls} w-full object-cover ${imgPos} ${rounded}`}
              />
            )}
            <div className="mx-auto max-w-2xl text-center">
              {eyebrowNode}
              {headlineNode}
              {subtitleNode}
              {bodyNode}
              {hasCta && <div className="mt-6">{ctaNode}</div>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ────── feature-duo ────────────────────────────────── */
  if (display === "feature-duo") {
    return (
      <section
        className={`py-10 sm:py-14 ${themeWrapCls(dc.theme)}`}
        style={sectionStyle(dc)}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col" style={gapStyle}>
            <div className="grid grid-cols-2" style={gapStyle}>
              <div className="relative">
                {editorial.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editorial.image}
                    alt={block.heading.title || ""}
                    className={`${ratioCls} w-full object-cover ${imgPos} ${rounded}`}
                  />
                ) : (
                  <div className={`${ratioCls} w-full bg-muted ${rounded}`} />
                )}
              </div>
              <div className="relative">
                {editorial.secondaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editorial.secondaryImage}
                    alt=""
                    className={`${ratioCls} w-full object-cover ${imgPos} ${rounded}`}
                  />
                ) : (
                  <div className={`${ratioCls} w-full bg-muted ${rounded}`} />
                )}
              </div>
            </div>
            <div className="mx-auto max-w-2xl text-center">
              {eyebrowNode}
              {headlineNode}
              {subtitleNode}
              {bodyNode}
              {hasCta && <div className="mt-6">{ctaNode}</div>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                        Collection editorial renderer                       */
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

function EditorialCollectionSection({ data }: { data: ResolvedBlock }) {
  const { block, items } = data;
  const dc = block.displayConfig;
  const ss = block.sourceStyles;

  if (items.length === 0) return null;

  return (
    <section
      className={`py-8 ${themeWrapCls(dc.theme)}`}
      style={sectionStyle(dc)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading data={data} />
        {renderBody(block.display, items, dc, ss)}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Public dispatcher                                 */
/* -------------------------------------------------------------------------- */

export function BlockSection({ data }: { data: ResolvedBlock }) {
  if (data.editorial) {
    // Feature displays render the editorial's story.
    if (
      isFeatureDisplay(data.block.display) ||
      data.block.display === "banner"
    ) {
      return <FeatureEditorialSection data={data} />;
    }
    // Grid / carousel / list / hero use the editorial's images as cards.
    return <EditorialCollectionSection data={data} />;
  }

  const { block, items } = data;
  const dc = block.displayConfig;
  const ss = block.sourceStyles;

  if (items.length === 0) return null;

  return (
    <section
      className={`py-8 ${themeWrapCls(dc.theme)}`}
      style={sectionStyle(dc)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading data={data} />
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

    case "banner":
      return (
        <BannerLayout
          item={items[0]}
          imagePosition={dc.imagePosition}
          textColor={cardProps.textColor}
        />
      );

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

function BannerLayout({
  item,
  imagePosition,
  textColor,
}: {
  item: NormalizedContentItem;
  imagePosition: ImagePosition;
  textColor?: string;
}) {
  if (!item) return null;
  const imgPos = IMG_POS_CLS[imagePosition] ?? IMG_POS_CLS.center;
  return (
    <Link
      href={item.href}
      className="relative block overflow-hidden rounded-2xl bg-muted"
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          className={`aspect-[21/9] w-full object-cover ${imgPos}`}
        />
      ) : (
        <div className="aspect-[21/9] w-full" />
      )}
      <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 to-transparent p-8">
        <h3
          className="text-2xl font-bold text-white sm:text-3xl"
          style={textColor ? { color: textColor } : undefined}
        >
          {item.name}
        </h3>
      </div>
    </Link>
  );
}

export default BlockSection;
