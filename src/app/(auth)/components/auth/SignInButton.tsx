"use client";
import { signIn, signOut } from "next-auth/react";

export function SignIn() {
  return (
    <button
      onClick={() => signIn()}
      className="bg-primary-500 rounded-full py-1 px-3 text-sm lg:text-base text-white hover:bg-primary/90 transition-colors"
    >
      Sign In
    </button>
  );
}

export function SignOut() {
  return (
    <button onClick={() => signOut()} className="">
      Sign Out
    </button>
  );
}
