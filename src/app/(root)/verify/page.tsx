"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(value);
    if (!value) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    let cancelled = false;
    api
      .post<{ message?: string }>("/auth/verify-email", { token: value })
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.data?.message ?? "Email verified.");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err?.response?.data?.message ??
            "This link is invalid or has expired.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resend = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: email.trim() });
      setMessage("If that account exists, a new verification link has been sent.");
    } catch {
      setMessage("Could not send a new link. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-foreground">
        Verify your email
      </h1>

      {status === "loading" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Verifying your link…
        </p>
      )}

      {status === "success" && (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
            {message}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-medium text-foreground">
              Resend verification link
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending || !email.trim()}
              className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              {resending ? "Sending…" : "Send new link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
