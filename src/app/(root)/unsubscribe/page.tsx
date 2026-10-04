// app/(legal)/unsubscribe/page.tsx
import Link from "next/link";
import { unsubscribeFromNewsletter } from "@/app/actions/newsletter";

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
    message = res.message || res.error || "Unknown error.";
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
