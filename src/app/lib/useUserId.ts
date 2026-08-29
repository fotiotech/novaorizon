// lib/useUserId.ts
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useUserId() {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    // 1) Use authenticated user ID if available
    if (session?.user?.id) {
      setUserId(session.user.id);
      return;
    }

    // 2) Otherwise, read guestId from cookie
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("guestId="));
    if (cookie) {
      setUserId(cookie.split("=")[1]);
    } else {
      // Fallback (shouldn't happen because middleware sets it)
      const newId = crypto.randomUUID();
      document.cookie = `guestId=${newId}; path=/; max-age=${60 * 60 * 24 * 365}`;
      setUserId(newId);
    }
  }, [session, status]);

  return userId;
}
