// components/RelatedMenus.tsx
import { getRelatedProducts } from "@/app/actions/events";
import { CarouselRail } from "@/components/content/Carousel";
import { ContentCard } from "@/components/content/ContentCard";
import type { NormalizedContentItem } from "@/lib/content/resolve";

// ---------- Typography tokens ----------
// Mirrors the token map in ProductDetailsClient.tsx so related products
// inherit the same visual rhythm as the rest of the product page.
const TYPO = {
  pageTitle: "text-base font-semibold text-foreground/90 leading-snug",
  sectionTitle: "text-lg font-semibold text-foreground leading-snug",
  label: "text-sm font-semibold text-foreground",
  price: "text-2xl font-semibold text-foreground leading-tight",
  body: "text-sm text-foreground",
  muted: "text-sm text-muted-foreground",
  tiny: "text-xs text-muted-foreground",
} as const;

const DEFAULT_LIMIT = 10;

/**
 * Normalizes a product doc into the shape ContentCard / CarouselRail expect.
 * Mirrors entityRegistry.Product.href / .image, inlined here so this file has
 * no dependency on the (server-only) registry.
 */
function normalizeProduct(doc: any): NormalizedContentItem {
  const images = Array.isArray(doc.images) ? doc.images : [];
  return {
    _id: String(doc._id),
    contentType: "Product",
    name: doc.name ?? "Untitled",
    description: doc.shortDescription ?? doc.description ?? null,
    image: images[0] ?? null,
    href: `/products/${doc.slug ?? doc._id}/${doc._id}`,
    price: typeof doc.price === "number" ? doc.price : null,
    listPrice: typeof doc.listPrice === "number" ? doc.listPrice : null,
  };
}

interface RelatedProductProps {
  productId: string;
  /** Max items to render. Defaults to 10. */
  limit?: number;
  /** "carousel" (default) for a horizontal rail, "grid" for a static grid. */
  layout?: "carousel" | "grid";
  /** Heading text. Pass `null` to render the rail without a heading. */
  title?: string | null;
  /** Optional "See all" link rendered to the right of the heading. */
  ctaText?: string;
  ctaHref?: string;
}

export default async function RelatedProduct({
  productId,
  limit = DEFAULT_LIMIT,
  layout = "carousel",
  title = "Related products",
  ctaText,
  ctaHref,
}: RelatedProductProps) {
  // getRelatedProducts already handles: manual relations → same category →
  // same brand → status: "active" only → excluding the current product.
  const raw = await getRelatedProducts(productId, limit);
  if (!raw.length) return null;

  const items = raw.map(normalizeProduct);
  const hasCta = Boolean(ctaText && ctaHref);

  return (
    <section className="pt-6">
      {title || hasCta ? (
        <div className="mb-3 flex items-end justify-between gap-4">
          {title ? <h2 className={TYPO.sectionTitle}>{title}</h2> : <span />}
          {hasCta ? (
            <a
              href={ctaHref}
              className={`${TYPO.label} text-primary transition-colors hover:underline`}
            >
              {ctaText}
            </a>
          ) : null}
        </div>
      ) : null}

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ContentCard key={`Product:${item._id}`} item={item} showImage />
          ))}
        </div>
      ) : (
        <CarouselRail items={items} showImages gap={16} />
      )}
    </section>
  );
}
