import { useAppDispatch } from "@/app/hooks";
import { useSession } from "@/lib/session";
import { useEffect } from "react";
import { useTrackEvent } from "@/components/EventTracker";

export default function ProductViewAnalytics({ productId }: { productId: string }) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const user = session?.user as any;
  const track = useTrackEvent();

  useEffect(() => {
    if (!productId) return;

    // Guests are tracked too — the backend derives the visitor from the
    // guest cookie / cart session. Previously this only dispatched for
    // signed-in users, so the live feed never saw product views.
    track({
      itemId: productId,
      eventType: "view",
      metadata: {
        path:
          typeof window !== "undefined"
            ? window.location.pathname
            : undefined,
      },
    });

    if (status === "authenticated" && user?.id) {
      dispatch({
        type: "userEvent/add",
        payload: {
          userId: user.id,
          productId,
          eventType: "view",
        },
      });
    }
  }, [status, user?.id, productId, dispatch, track]);

  return null; // This component doesn't render anything
}