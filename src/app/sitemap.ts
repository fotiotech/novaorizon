// app/sitemap.ts
import type { MetadataRoute } from "next";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { getCategoriesForTree } from "@/app/actions/category";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaorizon.com";

// Must match the slugify used by /products/page.tsx and
// /products/[slug]/[_id]/page.tsx.
function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Percent-encode a path segment so it is valid in both URLs and XML.
 * Category slugs in the current DB contain `>` separators, which are
 * illegal in XML. This converts them to `%3E`.
 */
function encodeSegment(s: string): string {
  return encodeURIComponent(s);
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ---------- Static routes ----------
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/category`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/returns-refunds`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ---------- Dynamic routes ----------
  let productEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];

  try {
    await connection();

    const [productsRaw, categoriesRaw] = await Promise.all([
      Product.find({})
        .select("_id name updatedAt createdAt categoryId")
        .lean()
        .exec(),
      getCategoriesForTree(),
    ]);

    const products = (productsRaw as any[]) || [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];

    // ---------- Product entries ----------
    productEntries = products
      .filter((p) => p && p._id && p.name)
      .map((p) => {
        const slug = slugify(p.name) || "product";
        const lastMod = p.updatedAt
          ? new Date(p.updatedAt)
          : p.createdAt
            ? new Date(p.createdAt)
            : now;

        return {
          url: `${SITE_URL}/products/${encodeSegment(slug)}/${String(p._id)}`,
          lastModified: lastMod,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        };
      });

    // ---------- Category entries ----------
    // Only include categories that reference at least one product.
    const usedCategoryIds = new Set<string>();
    for (const p of products) {
      const cid = (p as any)?.categoryId;
      if (!cid) continue;
      const key =
        typeof cid === "object" && cid !== null
          ? String((cid as any)._id ?? cid)
          : String(cid);
      if (key) usedCategoryIds.add(key);
    }

    categoryEntries = categories
      .filter((c: any) => c && c._id && usedCategoryIds.has(String(c._id)))
      .map((c: any) => {
        // getCategoriesForTree returns `slug`, not `url_slug`.
        const rawSlug = c.slug || slugify(c.name || "") || "category";
        const slug = encodeSegment(rawSlug);

        const lastMod = c.updatedAt ? new Date(c.updatedAt) : now;

        return {
          url: `${SITE_URL}/category/${slug}/${String(c._id)}`,
          lastModified: lastMod,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      });
  } catch (err) {
    console.error("[sitemap] failed to load dynamic routes:", err);
  }

  return [...staticRoutes, ...categoryEntries, ...productEntries];
}
