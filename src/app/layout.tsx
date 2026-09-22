import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Script from "next/script";
import { Geist } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Suspense } from "react";
import Loading from "./loading";
import { cn } from "@/lib/utils";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getSeoSetting } from "@/app/actions/seo";
import { DEFAULT_SEO } from "@/app/lib/seo-defaults";

// Use Geist as the default font (includes a CSS variable)
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans", // makes the font available via CSS variable
});

// Fallbacks specific to the root layout that aren't part of the SEO settings
// form (site URL, social handles, verification tokens, image dimensions).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dyfk-com.vercel.app";
const TWITTER_HANDLE = "@dyfkCameroun";
const GOOGLE_VERIFICATION = "jGAR6wmWVPQe_fzOwoL1MqqKWSdN-Ty2dFf60Zu";

export async function generateMetadata(): Promise<Metadata> {
  // If the DB read fails for any reason, fall back to defaults so the app
  // still ships valid metadata instead of a 500 from the root layout.
  let seo = DEFAULT_SEO;
  try {
    seo = await getSeoSetting();
  } catch (err) {
    console.error("[layout] Failed to load SEO settings:", err);
  }

  const {
    siteName,
    title,
    description,
    keywords,
    canonicalUrl,
    ogImage,
    robots,
  } = seo;

  const robotsValue =
    robots === "noindex,nofollow"
      ? { index: false, follow: false }
      : { index: true, follow: true };

  return {
    // The root "default" title is used when a page doesn't set its own.
    // The template is applied to child pages that do set one.
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: keywords
      ? keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl || "/",
    },
    robots: robotsValue,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonicalUrl || SITE_URL,
      siteName,
      title,
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    verification: {
      google: GOOGLE_VERIFICATION,
    },
  };
}

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geist.variable, "font-sans")}>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PKXZ9B9T');
            `,
          }}
        />
        {/* Monetbil Widget */}
        <Script
          src="https://www.monetbil.com/widget/v2/monetbil.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={geist.variable}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PKXZ9B9T"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <Providers>
          <Suspense fallback={<Loading />}>
            <PageViewTracker />
            <div className="flex flex-col min-h-screen">
              <Header />

              <div className="flex-1 pt-[100px]">{children}</div>

              <Footer />
            </div>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
