"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!PIXEL_ID || !window.fbq) return;

    // Track standard pageview on route changes
    window.fbq("track", "PageView");
  }, [pathname, searchParams]);

  if (!PIXEL_ID) return null;

  return (
    <>
      {/* Meta Pixel Base Code */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://facebook.net');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* Fallback for users with JavaScript disabled */}
      <noscript>
        <img
          className="hidden"
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://facebook.com{PIXEL_ID}&ev=PageView&noscript=1`}
          alt="pixel-fallback"
        />
      </noscript>
    </>
  );
}
