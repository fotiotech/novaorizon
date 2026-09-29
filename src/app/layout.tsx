import type { Metadata, Viewport } from "next";
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

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaorizon.com";
const TWITTER_HANDLE = "@novaorizon";
const GOOGLE_VERIFICATION = "jGAR6wmWVPQe_fzOwoL1MqqKWSdN-Ty2dFf60Zu";

export async function generateMetadata(): Promise<Metadata> {
  let seo = DEFAULT_SEO;
  try {
    seo = await getSeoSetting();
  } catch (err) {
    console.error("[layout] Failed to load SEO settings:", err);
  }

  const { siteName, title, description, keywords, ogImage, robots } = seo;

  const robotsValue =
    robots === "noindex,nofollow"
      ? { index: false, follow: false }
      : { index: true, follow: true };

  return {
    // Applies to pages that don't set their own title.
    // The template applies to pages that do.
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

    // Needed so relative canonicals on child pages resolve correctly.
    metadataBase: new URL(SITE_URL),

    // NOTE: canonical is intentionally NOT set here.
    // Each page owns its own canonical. Setting it in the root layout
    // would make every page that lacks one declare itself a duplicate
    // of the homepage, which blocks indexing.

    robots: robotsValue,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: SITE_URL,
      siteName,
      title,
      description,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: title }]
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

// Object form — the string form does not emit a proper <meta viewport>.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geist.variable, "font-sans")}>
      <body className="font-sans">
        {/* GTM noscript fallback */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PKXZ9B9T"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />

            {/* Only the page content sits in a Suspense boundary.
                Header and Footer render as part of the initial HTML. */}
            <main className="flex-1 pt-[100px]">
              <Suspense fallback={<Loading />}>{children}</Suspense>
            </main>

            <Footer />
          </div>

          {/* PageViewTracker uses useSearchParams, so it needs its own boundary. */}
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
        </Providers>

        {/* Scripts live in body in App Router. next/script handles injection. */}
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
        <Script
          src="https://www.monetbil.com/widget/v2/monetbil.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
