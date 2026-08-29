// lib/getUserId.ts
import { auth } from "@/app/auth";
import { cookies } from "next/headers";

export async function getCurrentUserId() {
  // 1) Get session – uses the current request context automatically
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // 2) Fallback to guest cookie
  const cookieStore: any = cookies();
  const guestId = cookieStore.get("guestId")?.value;
  if (guestId) return guestId;

  // 3) Should never happen because middleware sets it, but just in case
  return crypto.randomUUID();
}
