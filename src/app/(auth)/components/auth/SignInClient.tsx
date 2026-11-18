// app/auth/login/SignInClient.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Where to land after a successful sign-in.
 *  - Explicit `?callbackUrl=` always wins (deep-link return).
 *  - Otherwise admins go to `/admin`, everyone else to `/`.
 */
function postLoginTarget(role: string, callbackUrl: string | null): string {
  if (callbackUrl) return callbackUrl;
  return role === "admin" ? "/admin" : "/";
}

export default function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    // Legacy NextAuth URLs (`?error=CredentialsSignin`) still work.
    const legacy = searchParams.get("error");
    if (legacy === "CredentialsSignin") return "Invalid email or password";
    if (legacy) return "Authentication failed. Please try again.";
    return null;
  });

  // If the user already has a live session, bounce them before they
  // can start typing. Replaces the `if (session) redirect(...)` in the
  // old server component.
  useEffect(() => {
    if (!loading && user) {
      router.replace(postLoginTarget(user.role, callbackUrl));
    }
  }, [loading, user, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const signedIn = await login(email.trim().toLowerCase(), password);
      router.replace(postLoginTarget(signedIn.role, callbackUrl));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const body = (err.response.data ?? {}) as { error?: string };

        if (status === 401) setError("Invalid email or password");
        else if (status === 429)
          setError(
            "Too many sign-in attempts. Please try again in 15 minutes.",
          );
        else if (status === 403)
          setError(body.error || "Your account is not active.");
        else if (body.error) setError(body.error);
        else setError(`Sign in failed (${status}). Please try again.`);
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  // Wait for the auth-check to finish so we don't flash the form for
  // an already-logged-in user before the useEffect redirect fires.
  if (loading) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full max-w-md space-y-3">
        <Link href={"/"} className="mb-8">
          <img
            title="logo"
            src="/novaorizon-dark.png"
            alt="logo"
            className="h-16 w-40"
          />
        </Link>
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Sign in to your account
            </h2>
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-center">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-700 disabled:opacity-60"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-700 disabled:opacity-60"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={pending}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {pending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* OAuth providers removed — backend has no /api/auth/google or
              /api/auth/github endpoints. Re-add when OAuth is ported
              (see the OAuth section in the previous message). */}

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
