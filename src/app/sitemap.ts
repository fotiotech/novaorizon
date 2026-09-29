// app/sitemap.ts
import type { MetadataRoute } from "next";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { getCategoriesForTree } from "@/app/actions/category";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaorizon.com";

// Slugify must match the one used across the app so URLs are identical.
function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Regenerate the sitemap at most once per hour. Products and categories
// added after deploy will be picked up on the next regeneration.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ---------- Static routes ----------
  // Only include publicly indexable pages. Do NOT include /cart, /checkout,
  // /search, /auth/*, /profile/* — those are all noindex.
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
  // Wrap in try/catch so a DB hiccup never breaks the whole sitemap.
  let productEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];

  try {
    await connection();

    const [products, categories] = await Promise.all([
      Product.find({}).select("_id name updatedAt createdAt").lean().exec(),
      getCategoriesForTree(),
    ]);

    // Products: /products/[slug]/[_id]
    productEntries = (products as any[]).map((p) => {
      const slug = slugify(p.name);
      const lastMod = p.updatedAt
        ? new Date(p.updatedAt)
        : p.createdAt
          ? new Date(p.createdAt)
          : now;

      return {
        url: `${SITE_URL}/products/${slug}/${p._id}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

    // Categories: /category/[slug]/[_id]
    // getCategoriesForTree returns a flat list with _id, name, and either
    // url_slug or slug. Fall back to a slugified name if neither exists.
    categoryEntries = (Array.isArray(categories) ? categories : []).map(
      (c: any) => {
        const slug =
          c.url_slug || c.slug || slugify(c.name || "") || "category";

        return {
          url: `${SITE_URL}/category/${slug}/${c._id}`,
          lastModified: c.updatedAt
            ? new Date(c.updatedAt)
            : c.createdAt
              ? new Date(c.createdAt)
              : now,
          changeFrequency: "weekly",
          priority: 0.7,
        };
      },
    );
  } catch (err) {
    // Don't fail the build if Mongo is unreachable — just ship the
    // static routes so Google still gets a valid sitemap.
    console.error("[sitemap] failed to load dynamic routes:", err);
  }

  return [...staticRoutes, ...categoryEntries, ...productEntries];
}
