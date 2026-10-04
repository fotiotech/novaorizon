// app/contact/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import Spinner from "@/components/Spinner";
import ContactClient from "./ContactClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://novaorizon.vercel.app";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have a question about an order, a product, or anything else? Contact the Novaorizon team — we typically respond within 24 hours.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "Contact Us",
    description:
      "Have a question about an order, a product, or anything else? Contact the Novaorizon team.",
    url: "/contact",
  },
};

// Organization + ContactPoint helps Google surface support info in the
// knowledge panel and gives AI assistants a structured way to reach you.
const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Novaorizon",
  url: SITE_URL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@novaorizon.com",
    telephone: "+237-6-XX-XX-XX-XX",
    availableLanguage: ["English", "French"],
    areaServed: "CM",
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* useSearchParams in the child requires a Suspense boundary. */}
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Spinner size={32} />
          </div>
        }
      >
        <ContactClient />
      </Suspense>
    </>
  );
}
