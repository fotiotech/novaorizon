// app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaorizon.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          // Utility pages — these already send noindex, but the disallow
          // saves crawl budget by preventing Googlebot from fetching them.
          "/cart",
          "/checkout",
          "/search",
          "/auth/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
