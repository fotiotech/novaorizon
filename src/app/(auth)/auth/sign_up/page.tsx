"use client";

import { signup } from "@/app/lib/actions";
import Image from "next/image";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

export default function SignupForm() {
  const [state, action] = useFormState(signup, undefined);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Link href="/">
        <Image
          title="logo"
          src="/logo.png"
          width={60}
          height={30}
          alt="logo"
          className="mb-4 p-2"
        />
      </Link>
      <form
        action={action}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
          Sign Up
        </h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              name="name"
              placeholder="Name"
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state?.errors?.name && (
              <p className="mt-1 text-sm text-red-600">{state.errors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state?.errors?.email && (
              <p className="mt-1 text-sm text-red-600">{state.errors.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              title="password"
              name="password"
              type="password"
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state?.errors?.password && (
              <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                <p className="font-medium">Password must:</p>
                <ul className="list-inside list-disc">
                  {state.errors.password.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <SubmitButton />
          <p className="text-center text-sm text-gray-600">
            Already have an account?
            <Link href="/auth/login" className="font-medium text-blue-600 hover:underline px-1">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      type="submit"
      className="w-full rounded-xl bg-blue-600 p-3 text-white font-medium transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {pending ? "Signing Up..." : "Sign Up"}
    </button>
  );
}
