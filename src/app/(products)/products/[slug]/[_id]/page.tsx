import ProductDetailsClient from "./_compnents/ProductDetailsClient";
import RelatedMenus from "./_compnents/RelatedMenus";
import { findProducts } from "@/app/actions/products";
import type { Metadata } from "next";

interface Params {
  slug: string;
  _id: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://novaorizon.vercel.app";

const CURRENCY = "XAF";

// ---------- helpers (mirrors of the client-side ones) ----------
function toImageUrl(entry: any): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    const candidate =
      entry.url ?? entry.src ?? entry.publicUrl ?? entry.path ?? entry.image;
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = candidate.url ?? candidate.src ?? candidate.publicUrl;
      if (typeof nested === "string") return nested;
    }
  }
  return null;
}

function normalizeImages(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of arr) {
    const url = toImageUrl(entry);
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

async function fetchProduct(id: string) {
  try {
    const result = await findProducts(id);
    if (!result || (result as any).success === false) return null;
    return result as any;
  } catch (err) {
    console.error("[product page] fetch failed:", err);
    return null;
  }
}

// ---------- metadata ----------
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, _id } = await params;
  const product = await fetchProduct(_id);

  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const name: string = product.name || "Product";
  const brand: string | undefined = product.brand?.name;

  // Prefer the short description; fall back to stripped HTML from the long one.
  const rawShort = stripHtml(product.shortDescription || "");
  const rawLong = stripHtml(product.description || "");
  const description = (rawShort || rawLong).slice(0, 160);

  const images = normalizeImages(product.images);
  const primaryImage = images[0];

  const price = pickPrice(product.price, product.listPrice);
  const inStock = Number(product.quantity) > 0;

  const canonicalPath = `/products/${slug}/${_id}`;

  // Title: include brand when available, keep under ~60 chars where possible.
  const title = brand ? `${name} — ${brand}` : name;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: brand,
      url: canonicalPath,
      images: primaryImage
        ? [
            {
              url: primaryImage,
              width: 1200,
              height: 630,
              alt: name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
    other: {
      "product:price:amount": price > 0 ? String(price) : "",
      "product:price:currency": CURRENCY,
      "product:availability": inStock ? "in stock" : "out of stock",
    },
  };
}

// ---------- page ----------
export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug, _id } = await params;

  // Fetch once on the server so the client component doesn't have to.
  const product = await fetchProduct(_id);

  // JSON-LD Product structured data for rich results.
  const jsonLd = product ? buildJsonLd({ product, slug, _id }) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // The payload is JSON.stringify of a plain object we built — safe.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <ProductDetailsClient
        productId={_id}
        initialProduct={product ?? undefined}
        relatedSlot={<RelatedMenus productId={_id} />}
      />
    </>
  );
}

// ---------- JSON-LD builder ----------
function buildJsonLd({
  product,
  slug,
  _id,
}: {
  product: any;
  slug: string;
  _id: string;
}) {
  const name: string = product.name || "Product";
  const description = stripHtml(
    product.shortDescription || product.description || "",
  ).slice(0, 500);

  const images = normalizeImages(product.images);
  const price = pickPrice(product.price, product.listPrice);
  const inStock = Number(product.quantity) > 0;

  const url = `${SITE_URL}/products/${slug}/${_id}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: images.length > 0 ? images : undefined,
    description: description || undefined,
    sku: product.sku || _id,
    brand: product.brand?.name
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    offers:
      price > 0
        ? {
            "@type": "Offer",
            url,
            priceCurrency: CURRENCY,
            price: String(price),
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          }
        : undefined,
    ...(Array.isArray(product.reviews) && product.reviews.length > 0
      ? {
          aggregateRating: buildAggregateRating(product.reviews),
        }
      : {}),
  };
}

function buildAggregateRating(reviews: any[]) {
  const ratings = reviews
    .map((r) => Number(r?.rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ratings.length === 0) return undefined;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return {
    "@type": "AggregateRating",
    ratingValue: (sum / ratings.length).toFixed(1),
    reviewCount: ratings.length,
    bestRating: "5",
    worstRating: "1",
  };
}
