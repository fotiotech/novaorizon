// lib/getUserId.ts
import { cookies } from "next/headers";
import { apiData } from "@/lib/server-api";

export async function getCurrentUserId() {
  // 1) Backend session (verified server-side).
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("session")?.value) {
      const me = await apiData<{ _id?: string; id?: string } | null>("/auth/me");
      const id = me?._id ?? me?.id;
      if (id) return String(id);
    }
  } catch {
    /* fall through to guest */
  }

  // 2) Guest cookie set by the app's middleware.
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guestId")?.value;
  if (guestId) return guestId;

  // 3) Last resort.
  return crypto.randomUUID();
}
