// app/auth/login/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import SignInClient from "../../components/auth/SignInClient";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Novaorizon account.",
  // Never index auth pages. `follow: true` lets Google follow links
  // from this page (Terms, Privacy, sign up) without indexing it.
  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
};

export default function SignInPage() {
  // `useSearchParams` inside the client requires a Suspense boundary
  // so Next.js can render the shell statically. The login page is not
  // indexable and not cached anyway, but the boundary is required by
  // the App Router's build-time check.
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInClient />
    </Suspense>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    </div>
  );
}
