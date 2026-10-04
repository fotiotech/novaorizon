import { useAppDispatch } from "@/app/hooks";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function ProductViewAnalytics({ productId }: { productId: string }) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const user = session?.user as any;

  useEffect(() => {
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
  }, [status, user?.id, productId, dispatch]);

  return null; // This component doesn't render anything
}