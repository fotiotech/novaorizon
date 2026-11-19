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
  NormalizedContentItem,
} from "@/lib/content/types";
import type {
  CardRatio,
  CardShape,
  CardSize,
  CardLayout,
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

const BANNER_OVERLAY_CLS: Record<string, string> = {
  none: "",
  light: "bg-white/30",
  dark: "bg-black/55",
  gradient: "bg-gradient-to-r from-black/75 via-black/45 to-transparent",
};

const BANNER_ALIGN_CLS: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const BANNER_POS_CLS: Record<string, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
};

const BANNER_MAXW_CLS: Record<string, string> = {
  left: "max-w-2xl",
  center: "max-w-3xl",
  right: "max-w-2xl ml-auto",
};

function BannerSlide({
  banner,
  dc,
}: {
  banner: ResolvedBanner;
  dc: ResolvedDisplayConfig;
}) {
  const paragraphs = banner.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  const cta = banner.cta;
  const hasCta = cta.style !== "none" && Boolean(cta.link);
  const wrapperHref = banner.link || (hasCta ? "" : cta.link);

  const frameCls =
    "relative h-full overflow-hidden " + (dc.rounded ? "rounded-2xl" : "");

  // Custom HTML banners own their entire slide; nothing is layered on top.
  if (banner.type === "html" && banner.html) {
    return (
      <div className={frameCls}>
        <div
          className="aspect-[21/9] w-full [&_iframe]:h-full [&_iframe]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          dangerouslySetInnerHTML={{ __html: banner.html }}
        />
      </div>
    );
  }

  // Compact tile presentation: the banner owns its ratio and size so a row of
  // logo cards does not depend on the block's card settings.
  const COMPACT_RATIO_CLS: Record<string, string> = {
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    "3:2": "aspect-[3/2]",
    "16:9": "aspect-[16/9]",
  };
  const COMPACT_SIZE: Record<
    string,
    { pad: string; logo: string; centerLogo: string; title: string; sub: string }
  > = {
    xs: {
      pad: "gap-1.5 px-2.5 py-2.5",
      logo: "h-7 w-7",
      centerLogo: "h-10 w-10",
      title: "text-[12px]",
      sub: "text-[10px]",
    },
    sm: {
      pad: "gap-2 px-3 py-3",
      logo: "h-8 w-8",
      centerLogo: "h-11 w-11",
      title: "text-[13px]",
      sub: "text-[11px]",
    },
    md: {
      pad: "gap-3 px-4 py-4",
      logo: "h-10 w-10",
      centerLogo: "h-14 w-14",
      title: "text-sm",
      sub: "text-[12px]",
    },
    lg: {
      pad: "gap-3.5 px-5 py-5",
      logo: "h-12 w-12",
      centerLogo: "h-16 w-16",
      title: "text-base",
      sub: "text-[13px]",
    },
  };

  // Compact banners are small tiles: a logo plus a title, either stacked and
  // centred or side by side. Useful for category / collection shortcuts.
  if (banner.type === "compact") {
    const isCenter = banner.align === "center";
    const dark = banner.theme === "dark";
    const s = COMPACT_SIZE[banner.size] ?? COMPACT_SIZE.md;
    // Ratio applies to every arrangement (the tile keeps a fixed aspect).
    const ratioCls = COMPACT_RATIO_CLS[banner.ratio] ?? COMPACT_RATIO_CLS["1:1"];

    const cardCls =
      "flex h-full w-full transition hover:opacity-90 " +
      s.pad +
      " " +
      (isCenter
        ? "flex-col items-center justify-center text-center " + ratioCls
        : banner.align === "right"
          ? "flex-row-reverse items-center justify-center text-right " + ratioCls
          : "flex-row items-center justify-center text-left " + ratioCls) +
      " " +
      (dc.rounded ? "rounded-2xl " : "") +
      (dark ? "bg-neutral-900 text-white" : "bg-white text-neutral-900") +
      " border border-black/5 shadow-sm";

    const content = (
      <div className={cardCls}>
        {banner.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.image}
            alt={banner.imageAlt || banner.heading.title || banner.name}
            className={
              "shrink-0 object-contain " +
              (isCenter ? s.centerLogo : s.logo)
            }
          />
        ) : null}
        <span className="min-w-0">
          <span className={"block truncate font-semibold " + s.title}>
            {banner.heading.title || banner.name}
          </span>
          {banner.heading.subtitle && (
            <span className={"mt-0.5 block truncate opacity-70 " + s.sub}>
              {banner.heading.subtitle}
            </span>
          )}
        </span>
      </div>
    );

    if (wrapperHref) {
      return (
        <Link
          href={ctaHrefSafe(wrapperHref)}
          target={banner.openInNewTab ? "_blank" : undefined}
          rel={banner.openInNewTab ? "noreferrer noopener" : undefined}
          className="block h-full"
          aria-label={banner.heading.title || banner.name}
        >
          {content}
        </Link>
      );
    }
    return content;
  }

  const isVideo = banner.type === "video" && Boolean(banner.videoUrl);
  const hasText = Boolean(
    banner.eyebrow ||
      banner.heading.title ||
      banner.heading.subtitle ||
      paragraphs.length ||
      hasCta,
  );
  const lightText = banner.theme !== "dark";
  const textCls = lightText ? "text-white" : "text-neutral-900";
  const subTextCls = lightText ? "text-white/80" : "text-neutral-700";
  const overlayCls =
    BANNER_OVERLAY_CLS[banner.overlay] ?? BANNER_OVERLAY_CLS.gradient;
  const alignCls = BANNER_ALIGN_CLS[banner.align] ?? BANNER_ALIGN_CLS.left;
  const posCls = BANNER_POS_CLS[banner.position] ?? BANNER_POS_CLS.center;
  const maxWCls = BANNER_MAXW_CLS[banner.align] ?? BANNER_MAXW_CLS.left;

  return (
    <div className={frameCls}>
      {isVideo ? (
        <video
          className="aspect-[21/9] w-full object-cover"
          src={banner.videoUrl}
          poster={banner.image || undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : banner.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.image}
          alt={banner.imageAlt || banner.heading.title || banner.name}
          className="aspect-[21/9] w-full object-cover object-center"
        />
      ) : (
        <div className="aspect-[21/9] w-full bg-neutral-900" />
      )}

      {hasText && overlayCls && (
        <div className={"absolute inset-0 " + overlayCls} />
      )}

      {wrapperHref && (
        <Link
          href={ctaHrefSafe(wrapperHref)}
          target={banner.openInNewTab ? "_blank" : undefined}
          rel={banner.openInNewTab ? "noreferrer noopener" : undefined}
          aria-label={banner.heading.title || banner.name}
          className="absolute inset-0 z-10"
        />
      )}

      {hasText && (
      <div
        className={"absolute inset-0 flex flex-col p-6 sm:p-10 lg:p-16 " + posCls}
      >
        <div className={"relative z-20 w-full " + maxWCls + " " + alignCls}>
          <div className={textCls}>
            {banner.eyebrow && (
              <p
                className={
                  "mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] " +
                  (lightText ? "text-white/70" : "text-neutral-600")
                }
              >
                {banner.eyebrow}
              </p>
            )}
            {banner.heading.title && (
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {banner.heading.title}
              </h2>
            )}
            {banner.heading.subtitle && (
              <p className={"mt-3 text-base sm:text-lg " + subTextCls}>
                {banner.heading.subtitle}
              </p>
            )}
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={"mt-3 text-sm leading-relaxed sm:text-base " + subTextCls}
              >
                {p}
              </p>
            ))}
            {hasCta && (
              <div className="mt-6">
                {cta.style === "button" ? (
                  <Link
                    href={ctaHrefSafe(cta.link)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {cta.text || "Learn more"}
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <Link
                    href={ctaHrefSafe(cta.link)}
                    className={
                      "inline-flex items-center gap-1 text-sm font-semibold transition hover:underline " +
                      (lightText ? "text-white" : "text-neutral-900")
                    }
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
      )}
    </div>
  );
}
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
      className={`m-1 p-2 lg:m-6 lg:p-3 ${themeWrapCls(dc.theme)}`}
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

interface SharedCardProps {
  size: CardSize;
  variant: "card" | "bare";
  shape: CardShape;
  ratio: CardRatio;
  layout: CardLayout;
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
    layout: dc.cardLayout,
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
  if (data.block.display === "banner" && data.banners) {
    return <BannerDisplay data={data} />;
  }
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