// components/content/BlockRenderer.tsx
import React from "react";
import Link from "next/link";
import { CarouselRail } from "./Carousel";
import { ContentCard } from "./ContentCard";
import { getResolvedCollections } from "@/app/actions/collection";
import { getEntityConfig } from "@/lib/content/entityRegistry";
import type { NormalizedContentItem } from "@/lib/content/resolve";
import type { BlockRefModel } from "@/lib/content/constants";

interface BlockRendererProps {
  className?: string;
  userId?: string;
}

/* ------------------------- normalization helper ------------------------- */
// Delegates href/image/label resolution to the entity registry so the
// storefront produces the same URLs as every other surface.

function normalize(targetType: string, doc: any): NormalizedContentItem | null {
  const cfg = getEntityConfig(targetType);
  if (!cfg || !doc?._id) return null;

  const item: NormalizedContentItem = {
    _id: String(doc._id),
    contentType: targetType as BlockRefModel,
    name: doc.name ?? "Untitled",
    description: doc.shortDescription ?? doc.description ?? undefined,
    image: cfg.image(doc) ?? null,
    href: cfg.href(doc),
  };

  if (targetType === "Product") {
    item.price = typeof doc.price === "number" ? doc.price : undefined;
    item.listPrice =
      typeof doc.listPrice === "number" ? doc.listPrice : undefined;
  }
  return item;
}

/* ------------------------------ heading -------------------------------- */

function SectionHeading({
  title,
  ctaText,
  ctaLink,
  ctaStyle,
}: {
  title?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  ctaStyle?: string | null;
}) {
  const style = ctaStyle ?? "none";
  const hasCta = style !== "none" && !!ctaText && !!ctaLink;

  if (!title && !hasCta) return null;

  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      {title ? (
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
      ) : (
        <span />
      )}
      {hasCta &&
        (style === "button" ? (
          <Link
            href={ctaLink!}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {ctaText}
          </Link>
        ) : (
          <Link
            href={ctaLink!}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
          >
            {ctaText}
            <span aria-hidden>→</span>
          </Link>
        ))}
    </div>
  );
}

/* ------------------------------ layouts -------------------------------- */

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
};

function CollectionBody({
  collection,
  items,
}: {
  collection: any;
  items: NormalizedContentItem[];
}) {
  const d = collection.display ?? {};
  const layout = d.layout ?? "carousel";
  const gap = d.gap ?? 16;
  const showImages = d.showImages !== false;
  const cardShape = (d.cardShape ?? "default") as "default" | "circle";

  if (layout === "carousel") {
    return (
      <CarouselRail
        items={items}
        showImages={showImages}
        gap={gap}
        cardOverride={{ shape: cardShape }}
      />
    );
  }

  if (layout === "list") {
    const imageRounding =
      cardShape === "circle" ? "rounded-full" : "rounded-lg";
    return (
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {items.map((item) => (
          <Link
            key={`${item.contentType}:${item._id}`}
            href={item.href}
            className="flex items-center gap-4 rounded-lg border bg-card p-3 hover:border-primary"
          >
            {showImages && item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                className={`h-16 w-16 object-cover ${imageRounding}`}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.name}</p>
              {item.description ? (
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    );
  }

  if (layout === "hero" && items.length > 0) {
    const [first, ...rest] = items;
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href={first.href}
          className="relative col-span-1 overflow-hidden rounded-2xl bg-muted lg:col-span-2"
        >
          {showImages && first.image ? (
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
            {first.description ? (
              <p className="line-clamp-2 text-sm text-white/80">
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
              shape={cardShape}
            />
          ))}
        </div>
      </div>
    );
  }

  const cols = GRID_COLS[d.columns ?? 4] ?? GRID_COLS[4];
  return (
    <div className={`grid ${cols}`} style={{ gap: `${gap}px` }}>
      {items.map((item) => (
        <ContentCard
          key={`${item.contentType}:${item._id}`}
          item={item}
          showImage={showImages}
          shape={cardShape}
        />
      ))}
    </div>
  );
}

/* ---------------------------- renderer ---------------------------------- */

export default async function BlockRenderer({
  className = "",
  userId,
}: BlockRendererProps) {
  const result = await getResolvedCollections({
    status: "active",
    resolveRecommendations: true,
    recommendationContext: { userId },
  });
  if (!result.success) return null;

  const rows = (result.data ?? []).filter(
    (row: any) => Array.isArray(row.items) && row.items.length > 0,
  );
  if (!rows.length) return null;

  return (
    <div className={className}>
      {rows.map((row: any) => {
        const targetType = row.collection.targetType as string;
        const items: NormalizedContentItem[] = row.items
          .map((doc: any) => normalize(targetType, doc))
          .filter(
            (x: NormalizedContentItem | null): x is NormalizedContentItem =>
              Boolean(x),
          );
        if (!items.length) return null;

        return (
          <section className="py-8" key={String(row.collection._id)}>
            <SectionHeading
              title={
                row.collection.showName !== false ? row.collection.name : null
              }
              ctaText={row.collection.ctaText}
              ctaLink={row.collection.ctaLink}
              ctaStyle={row.collection.ctaStyle}
            />
            <CollectionBody collection={row.collection} items={items} />
          </section>
        );
      })}
    </div>
  );
}
