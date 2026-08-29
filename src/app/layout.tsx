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

// Use Geist as the default font (includes a CSS variable)
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans", // makes the font available via CSS variable
});

export const metadata: Metadata = {
  title: {
    default: "dyfkCameroun.com - Your Trusted E-Commerce Platform in Cameroun",
    template: "%s | dyfkCameroun.com",
  },
  description:
    "Discover the best products at unbeatable prices on dyfkCameroun.com. Shop now for a seamless online shopping experience.",
  metadataBase: new URL("https://dyfk-com.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dyfk-com.vercel.app",
    siteName: "dyfkCameroun.com",
    title: "dyfkCameroun.com - Your Trusted E-Commerce Platform in Cameroun",
    description:
      "Discover the best products at unbeatable prices on dyfkCameroun.com. Shop now for a seamless online shopping experience.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "dyfkCameroun.com - Your Trusted E-Commerce Platform in Cameroun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dyfkCameroun",
    creator: "@dyfkCameroun",
    title: "dyfkCameroun.com - Your Trusted E-Commerce Platform in Cameroun",
    description:
      "Discover the best products at unbeatable prices on dyfkCameroun.com. Shop now for a seamless online shopping experience.",
    images: ["/logo.png"],
  },
  verification: {
    google: "jGAR6wmWVPQe_fzOwoL1MqqKWSdN-Ty2dFf60Zu",
  },
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Removed unused "theme" class – only keep font variable and font-sans utility
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
      {/* 
        The body will get its background from globals.css (via @layer base).
        We also keep the font variable for consistency.
      */}
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
          <PageViewTracker />
          <div className="flex flex-col min-h-screen">
            <Header />
            <Suspense fallback={<Loading />}>
              <div className="flex-1 ">{children}</div>
            </Suspense>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
