// components/SEOHead.tsx
"use client";

import React from "react";
import Head from "next/head";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "novaorizon | Your One-Stop E-commerce Solution",
  description = "Discover a wide range of products at unbeatable prices. Shop now and experience seamless online shopping with novaorizon.",
  canonicalUrl,
  ogImage = "/logo.png",
  noindex = false,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullCanonicalUrl = canonicalUrl || baseUrl;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta
        property="og:image"
        content={ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`}
      />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta
        name="twitter:image"
        content={ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`}
      />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
  );
};

export default SEOHead;
