// components/SessionObserver.tsx (add to layout)
"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { mergeGuestEvents } from "@/app/actions/events";

export function SessionObserver() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // Read guestId from cookie
      const guestId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("guestId="))
        ?.split("=")[1];
      if (guestId) {
        mergeGuestEvents(guestId, session.user.id).catch(console.error);
        // Optionally clear the guest cookie after merging
        document.cookie =
          "guestId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  }, [session, status]);

  return null;
}
