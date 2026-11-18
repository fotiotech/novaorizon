// app/(legal)/unsubscribe/page.tsx
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/server-api";

/**
 * GET /api/newsletter/unsubscribe/:token — public.
 *
 * Never throws: a bad/expired token (or an unreachable API during a build)
 * degrades to the same inline error message the page has always shown.
 */
async function unsubscribeFromNewsletter(
  token: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await apiFetch<{ success?: boolean; message?: string }>(
      `/newsletter/unsubscribe/${encodeURIComponent(token)}`,
    );

    return {
      success: true,
      message: res?.message || "You've been unsubscribed.",
    };
  } catch (error) {
    console.error("[unsubscribeFromNewsletter] Error:", error);
    return {
      success: false,
      message:
        error instanceof ApiError
          ? error.message
          : "Unable to unsubscribe.",
    };
  }
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  let ok = false;
  let message = "Missing unsubscribe token.";

  if (token) {
    const res = await unsubscribeFromNewsletter(token);
    ok = res.success;
    message = res.message;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">
          Newsletter Unsubscribe
        </h1>
        <p className={`mt-4 text-sm ${ok ? "text-green-700" : "text-red-700"}`}>
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
