// components/content/BlockRenderer.tsx
import React from "react";
import { CarouselRail } from "./Carousel";
import { getCollectionsWithProducts } from "@/app/actions/collection";
import { getCategoryCollectionsWithCategories } from "@/app/actions/categoryCollection";
import type {
  NormalizedContentItem,
  ResolveContext,
} from "@/lib/content/resolve";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface BlockRendererProps {
  /** Kept for backward-compatibility with callers; unused by this renderer. */
  location?: string;
  /** Reserved for future per-context resolution (e.g. product-page related). */
  context?: ResolveContext;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*                               Normalization                                */
/* -------------------------------------------------------------------------- */

function normalizeProduct(p: any): NormalizedContentItem | null {
  if (!p || !p._id) return null;
  const images = Array.isArray(p.images) ? p.images : [];
  return {
    _id: String(p._id),
    contentType: "Product",
    name: p.name || "Untitled product",
    description: p.shortDescription || p.description || undefined,
    image: images[0] || undefined,
    href: p.slug ? `/products/${p.slug}` : `/products/${p._id}`,
    price: typeof p.price === "number" ? p.price : undefined,
    listPrice: typeof p.listPrice === "number" ? p.listPrice : undefined,
    subline: typeof p.brand === "string" ? p.brand : undefined,
  };
}

function normalizeCategory(c: any): NormalizedContentItem | null {
  if (!c || !c._id) return null;
  // Category.imageUrl is a string[] in the schema; use the first image.
  const images = Array.isArray(c.imageUrl) ? c.imageUrl : [];
  return {
    _id: String(c._id),
    contentType: "Category",
    name: c.name || "Untitled category",
    description: c.description || undefined,
    image: images[0] || undefined,
    href: c.slug ? `/categories/${c.slug}` : `/categories/${c._id}`,
    subline: typeof c.slug === "string" ? c.slug : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*                             Layout primitives                              */
/* -------------------------------------------------------------------------- */

function SectionHeading({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function CollectionSection({
  name,
  showName,
  items,
}: {
  name: string;
  showName: boolean;
  items: NormalizedContentItem[];
}) {
  if (!items.length) return null;
  return (
    <section className="py-8">
      {showName ? <SectionHeading title={name} /> : null}
      <CarouselRail items={items} showImages gap={16} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              BlockRenderer                                 */
/* -------------------------------------------------------------------------- */

export default async function BlockRenderer({
  className = "",
}: BlockRendererProps) {
  // Fetch product + category collections in parallel.
  const [productRes, categoryRes] = await Promise.all([
    getCollectionsWithProducts(),
    getCategoryCollectionsWithCategories(),
  ]);

  const productRows: any[] =
    productRes.success && Array.isArray(productRes.data) ? productRes.data : [];
  const categoryRows: any[] =
    categoryRes.success && Array.isArray(categoryRes.data)
      ? categoryRes.data
      : [];

  // Only render active collections that have resolvable items. Related
  // collections depend on a page-level context, so they're excluded here.
  const visibleProductCollections = productRows.filter(
    (row) =>
      row?.collection?.status === "active" && !row.requiresProductContext,
  );
  const visibleCategoryCollections = categoryRows.filter(
    (row) =>
      row?.collection?.status === "active" && !row.requiresCategoryContext,
  );

  if (!visibleProductCollections.length && !visibleCategoryCollections.length) {
    return null;
  }

  return (
    <div className={className}>
      {/* ──────────────── Section 1: Product collections ──────────────── */}
      {visibleProductCollections.map((row) => {
        const items = (row.items || [])
          .map(normalizeProduct)
          .filter((x: any): x is NormalizedContentItem => Boolean(x));
        return (
          <CollectionSection
            key={`product-${row.collection._id}`}
            name={row.collection.name}
            showName={row.collection.showName !== false}
            items={items}
          />
        );
      })}

      {/* ──────────────── Section 2: Category collections ──────────────── */}
      {visibleCategoryCollections.map((row) => {
        const items = (row.items || [])
          .map(normalizeCategory)
          .filter((x: any): x is NormalizedContentItem => Boolean(x));
        return (
          <CollectionSection
            key={`category-${row.collection._id}`}
            name={row.collection.name}
            showName={row.collection.showName !== false}
            items={items}
          />
        );
      })}
    </div>
  );
}
