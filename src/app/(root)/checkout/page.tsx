// app/checkout/page.tsx
import type { Metadata } from "next";
import CheckoutClient from "./_component/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Novaorizon order.",
  // Never index checkout. `follow: false` because there is nothing on this
  // page Google needs to discover — cart/checkout links are already
  // crawlable from the cart page and product pages.
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  // No canonical — contradictory with noindex.
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
