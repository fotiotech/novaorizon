"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export function ProviderButtons({
  callbackUrl = "/",
}: {
  callbackUrl?: string;
}) {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProviders().then((p) => {
      if (!cancelled) setProviders(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely while loading or if there are no OAuth providers configured.
  if (!providers) return null;
  const list = Object.values(providers).filter((p) => p.type === "oauth");
  if (list.length === 0) return null;

  const handleClick = async (providerId: string) => {
    setLoading(providerId);
    await signIn(providerId, { callbackUrl });
    // signIn redirects; no need to setLoading(false) on success.
  };

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {list.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={loading !== null}
            onClick={() => handleClick(provider.id)}
            className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {loading === provider.id ? (
              <svg
                className="animate-spin h-4 w-4 mr-2 text-gray-500"
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
            ) : null}
            <span className="sr-only">Sign in with {provider.name}</span>
            {provider.name}
          </button>
        ))}
      </div>
    </div>
  );
}
