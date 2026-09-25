"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { signup } from "@/app/lib/actions";
import { EMAIL_REGEX } from "@/app/lib/definitions";

interface Props {
  callbackUrl?: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({
  callbackUrl = "/",
  onSuccess,
  onSwitchToLogin,
}: Props) {
  const router = useRouter();
  const [state, action]: any = useFormState(signup, undefined);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // Client-side pre-validation on submit
  const validate = () => {
    const errs: Record<string, string> = {};

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!name.trim()) errs.name = "Full name is required.";
    else if (parts.length < 2)
      errs.name = "Please enter both your first and last name.";

    if (!email) errs.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) errs.email = "Enter a valid email.";

    if (!password) errs.password = "Password is required.";
    else if (password.length < 8)
      errs.password = "Must be at least 8 characters.";
    else if (!/[a-zA-Z]/.test(password))
      errs.password = "Contain at least one letter.";
    else if (!/[0-9]/.test(password))
      errs.password = "Contain at least one number.";
    else if (!/[^a-zA-Z0-9]/.test(password))
      errs.password = "Contain at least one special character.";

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!validate()) e.preventDefault();
  };

  // When the server action succeeds, auto sign in and close the modal.
  useEffect(() => {
    if (!state?.message || state.error || state.errors) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (cancelled) return;
      setLoading(false);

      if (res?.error) {
        // Account created but auto sign-in failed — fall back to login
        onSwitchToLogin?.();
        return;
      }

      // Close the modal first so the transition is smooth.
      onSuccess?.();

      // Navigate to the intended page, or just refresh the current one
      // so server components pick up the session.
      if (callbackUrl && callbackUrl !== window.location.pathname) {
        router.push(callbackUrl);
      } else {
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const clearClientError = (field: string) =>
    setClientErrors((p) => {
      if (!p[field]) return p;
      const n = { ...p };
      delete n[field];
      return n;
    });

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label
          htmlFor="signup-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Full Name
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearClientError("name");
          }}
          placeholder="Jane Doe"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            clientErrors.name || state?.errors?.name
              ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800"
          }`}
        />
        {(clientErrors.name || state?.errors?.name) && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {clientErrors.name || state.errors?.name?.[0]}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="signup-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearClientError("email");
          }}
          placeholder="you@example.com"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            clientErrors.email || state?.errors?.email
              ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800"
          }`}
        />
        {(clientErrors.email || state?.errors?.email) && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {clientErrors.email || state.errors?.email?.[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="signup-password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearClientError("password");
          }}
          placeholder="Create a strong password"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            clientErrors.password || state?.errors?.password
              ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800"
          }`}
        />
        {clientErrors.password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {clientErrors.password}
          </p>
        )}
        {state?.errors?.password && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Password requirements:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-1">
              {state.errors.password.map((error: any, i: number) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        You can add your phone number, avatar, and preferences later from your
        profile.
      </p>

      {state?.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {state.error}
        </div>
      )}
      {state?.message && !state.errors && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
          {state.message}
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
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </button>

      {onSwitchToLogin && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-1">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}
