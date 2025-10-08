// app/api/sitemap/route.ts
import { NextResponse } from "next/server";
import { findProductsForSitemap } from "@/app/actions/products";
import { Category, Product } from "@/constant/types";
import { getCategory } from "@/app/actions/category";
import SitemapSettings from "@/models/SitemapSettings";
import { connection } from "@/utils/connection";

// Add caching headers for better performance
export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

async function getStaticPages() {
  return [
    {
      loc: "/",
      lastmod: new Date().toISOString().split("T")[0],
      priority: 1.0,
      changefreq: "daily" as const,
    },
    {
      loc: "/about",
      lastmod: "2024-12-01",
      priority: 0.5,
      changefreq: "monthly" as const,
    },
    {
      loc: "/contact",
      lastmod: "2024-12-01",
      priority: 0.5,
      changefreq: "monthly" as const,
    },
  ];
}

// Helper function to check if URL is excluded
function isUrlExcluded(url: string, excludedUrls: any[] = []): boolean {
  if (!excludedUrls.length) return false;

  return excludedUrls.some((excluded) => {
    if (excluded.pattern) {
      try {
        const regex = new RegExp(excluded.pattern);
        return regex.test(url);
      } catch {
        return false;
      }
    }
    return excluded.url === url;
  });
}

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://novaorizon.vercel.app";

  if (!baseUrl) {
    return new NextResponse("Base URL not configured", { status: 500 });
  }

  try {
    // Connect to database first
    await connection();

    // Get sitemap settings
    const sitemapSettings = await SitemapSettings.findOne();

    // Fetch data from the database
    const [staticPages, products, categories] = await Promise.all([
      getStaticPages(),
      findProductsForSitemap(),
      getCategory(),
    ]);

    // Filter static pages based on excluded URLs
    const filteredStaticPages = staticPages.filter(
      (page) => !isUrlExcluded(page.loc, sitemapSettings?.excludedUrls || [])
    );

    const categoryUrls = categories
      .map(({ url_slug, _id, updated_at }: any) => ({
        loc: `/category/${url_slug}/${_id}`,
        lastmod: updated_at,
        priority: sitemapSettings?.prioritySettings?.categories || 0.7,
        changefreq: "weekly" as const,
      }))
      .filter(
        (category: any) =>
          !isUrlExcluded(category.loc, sitemapSettings?.excludedUrls || [])
      );

    const productUrls = products
      .map(({ url_slug, dsin, updated_at }) => ({
        loc: `/${url_slug}/details/${dsin}`,
        lastmod: updated_at,
        priority: sitemapSettings?.prioritySettings?.products || 0.8,
        changefreq: "weekly" as const,
      }))
      .filter(
        (product) =>
          !isUrlExcluded(product.loc, sitemapSettings?.excludedUrls || [])
      );

    // Combine all pages into a single array
    const urls = [...filteredStaticPages, ...categoryUrls, ...productUrls];

    // Generate XML content
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod, priority = 0.8, changefreq = "weekly" }) => `
  <url>
    <loc>${baseUrl}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

    // Return XML response with caching headers
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
