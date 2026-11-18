// lib/api/newsletter.ts
import api from "@/lib/api";

/**
 * Public newsletter endpoints live on the Express backend (`/api/newsletter`).
 *
 * Client-side replacement for the old `app/actions/newsletter.ts`. The
 * unsubscribe flow is server-rendered (see `app/(root)/unsubscribe/page.tsx`),
 * so it goes through `@/lib/server-api` instead of this module.
 */

/** Pulls the first validation message out of the backend error envelope. */
function errorMessage(error: any, fallback: string): string {
  const payload = error?.response?.data;
  if (payload?.errors && typeof payload.errors === "object") {
    const first = Object.values(payload.errors as Record<string, unknown>)
      .flat()
      .find((v) => typeof v === "string" && v.length > 0);
    if (typeof first === "string") return first;
  }
  if (payload?.message) return String(payload.message);
  if (payload?.error) return String(payload.error);
  if (error?.message) return String(error.message);
  return fallback;
}

/* -------------------- Public: Subscribe -------------------- */

/**
 * POST /api/newsletter/subscribe — public.
 *
 * Returns the same `{ success, error?, message? }` shape the old server
 * action returned so the form keeps its current behaviour.
 */
export async function subscribeToNewsletter(payload: {
  email: string;
  source?: string;
  userId?: string | null;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const email = payload.email?.trim().toLowerCase().slice(0, 200);

  if (!email) {
    return { success: false, error: "Please enter your email address." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const res = await api.post<{ success?: boolean; message?: string }>(
      "/newsletter/subscribe",
      {
        email,
        source: payload.source || "footer",
        userId: payload.userId ?? undefined,
      },
    );

    return {
      success: true,
      message:
        res.data?.message ??
        "Thanks for subscribing! Check your inbox for updates.",
    };
  } catch (error) {
    console.error("[subscribeToNewsletter] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to subscribe. Please try again."),
    };
  }
}
