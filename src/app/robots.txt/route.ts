// app/robots.txt/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clickitcome.com";
  const environment = process.env.NODE_ENV;

  const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/api/sitemap

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/admin/
Disallow: /api/secure/
Disallow: /dashboard/


# User-generated content areas (if any)
Disallow: /user/
Disallow: /account/
Disallow: /cart/
Disallow: /checkout/
Disallow: /wishlist/

# Crawl delay (optional, reduce server load)
Crawl-delay: 1

# Specific bot instructions (optional)
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Google-Extended
Disallow: /`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}