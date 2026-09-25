"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { EMAIL_REGEX } from "@/app/lib/definitions";

interface Props {
  callbackUrl?: string;
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function LoginForm({
  callbackUrl = "/",
  onSuccess,
  onSwitchToSignup,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) errs.email = "Enter a valid email.";
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // Close the modal first so the transition is smooth.
    setLoading(false);
    onSuccess?.();

    // Navigate to the intended page, or just refresh the current one
    // so server components (header, cart badge, etc.) pick up the session.
    if (callbackUrl && callbackUrl !== window.location.pathname) {
      router.push(callbackUrl);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((p) => {
                const n = { ...p };
                delete n.email;
                return n;
              });
            }
          }}
          placeholder="you@example.com"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            fieldErrors.email
              ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800"
          }`}
        />
        {fieldErrors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <a
            href="/auth/forgot-password"
            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Forgot?
          </a>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {
              setFieldErrors((p) => {
                const n = { ...p };
                delete n.password;
                return n;
              });
            }
          }}
          placeholder="••••••••"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            fieldErrors.password
              ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800"
          }`}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
      >
        {loading ? (
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

      {onSwitchToSignup && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-1">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Sign up
          </button>
        </p>
      )}
    </form>
  );
}
