"use client";

import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import Link from "next/link";
import api from "@/lib/api";
import { useState } from "react";

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setError(null);
    setPending(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      setRegistered(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const body = (err.response.data ?? {}) as {
          error?: string;
          fieldErrors?: Record<string, string[]>;
        };
        if (body.fieldErrors) setErrors(body.fieldErrors);
        else setError(body.error || "Registration failed.");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setResendMessage("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendMessage("A new verification link has been sent.");
    } catch {
      setResendMessage("Could not resend the link. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-4 bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-sm text-gray-600">
            We sent a verification link to <strong>{email}</strong>. Click it
            to verify your account. You can browse while you wait.
          </p>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={resending}
            className="w-full py-2 border rounded-md text-sm disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
          {resendMessage && (
            <p className="text-xs text-gray-600">{resendMessage}</p>
          )}
          <Link href="/" className="block text-sm text-indigo-600">
            Continue to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <Link href={"/"} className="block text-center">
          <img
            title="logo"
            src="/novaorizon-dark.png"
            alt="logo"
            className="mx-auto h-16 w-40"
          />
        </Link>
        <h2 className="text-center text-2xl font-bold">Create your account</h2>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>
            )}
          </div>
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email[0]}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.password && (
              <ul className="text-xs text-red-600 mt-1 list-disc pl-4">
                {errors.password.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-indigo-600">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}