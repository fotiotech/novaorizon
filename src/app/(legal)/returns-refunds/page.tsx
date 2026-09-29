// app/returns-refunds/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import Spinner from "@/components/Spinner";
import ReturnsClient from "./ReturnsClient";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "Look up an order and request a return or refund. Consumers in Cameroon have 15 business days from delivery to withdraw from a purchase.",
  alternates: { canonical: "/returns-refunds" },
  openGraph: {
    type: "website",
    title: "Returns & Refunds",
    description:
      "Look up an order and request a return or refund on Novaorizon.",
    url: "/returns-refunds",
  },
};

export default function ReturnsRefundsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      }
    >
      <ReturnsClient />
    </Suspense>
  );
}
