// app/search/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import Spinner from "@/components/Spinner";
import SearchClient from "./_component/SearchClient";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Novaorizon catalogue.",
  // Search results are query-dependent and must never be indexed.
  // `follow: true` lets Google discover product pages linked from results.
  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
  // No canonical — contradictory with noindex.
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
