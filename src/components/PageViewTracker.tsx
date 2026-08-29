// app/layout.tsx
"use client";

import { EventTracker } from "@/components/EventTracker";
import { usePathname, useSearchParams } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath =
    pathname + (searchParams?.toString() ? `?${searchParams}` : "");

  return (
    <EventTracker
      eventType="page_view"
      metadata={{ path: fullPath }}
      // Re‑track when path changes (trackOnChange = true)
      trackOnChange
      dependencies={[pathname, searchParams?.toString()]}
    />
  );
}
