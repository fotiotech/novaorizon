import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const GUEST_COOKIE = "guestId";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

/**
 * Returns the guest identity cookie, creating it when absent. Only call
 * this from a Server Action or Route Handler (cookies cannot be set while
 * rendering a Server Component).
 */
export async function getOrCreateGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;

  const guestId = randomUUID();
  store.set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return guestId;
}
