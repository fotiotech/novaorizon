// components/SessionObserver.tsx (add to layout)
"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { mergeGuestEvents } from "@/app/actions/events";
import { mergeGuestSessionData } from "@/app/actions/cart";
import { mergeGuestAddresses } from "@/app/actions/address";
import { mergeGuestPaymentMethods } from "@/app/actions/payment";

export function SessionObserver() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const guestId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("guestId="))
      ?.split("=")[1];
    const sessionId = localStorage.getItem("sessionId") || undefined;

    if (guestId || sessionId) {
      mergeGuestSessionData({
        guestId,
        sessionId,
        userId: session.user.id,
      }).catch(console.error);

      mergeGuestEvents(guestId || sessionId || "", session.user.id).catch(
        console.error,
      );
      mergeGuestAddresses({ guestId, userId: session.user.id }).catch(
        console.error,
      );
      mergeGuestPaymentMethods({ guestId, userId: session.user.id }).catch(
        console.error,
      );

      document.cookie =
        "guestId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      localStorage.removeItem("sessionId");
    }
  }, [session, status]);

  return null;
}
