"use client";

import { NextSeo } from "next-seo";

// Define props for the SEO component
type SEOProps = {
  title: string;
  description: string;
};

// SEO component that uses NextSeo
const SEO: React.FC<SEOProps> = ({ title, description }) => {
  return <NextSeo title={title} description={description} />;
};

export default SEO;
