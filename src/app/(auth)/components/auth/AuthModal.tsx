"use client";

import { useEffect } from "react";
import { useAuthModal } from "@/app/context/AuthModalContext";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ProviderButtons } from "./ProviderButtons";

export function AuthModal() {
  const { isOpen, mode, close, setMode, callbackUrl } = useAuthModal();

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex bg-white dark:bg-gray-800 sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm sm:p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 w-full h-full flex flex-col overflow-y-auto sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end p-3 shrink-0">
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Heading */}
        <div className="px-6 pb-4 text-center shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === "login"
              ? "Sign in to continue"
              : "Get started in under a minute"}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex-1 sm:flex-none">
          {mode === "login" ? (
            <LoginForm
              callbackUrl={callbackUrl}
              onSuccess={close}
              onSwitchToSignup={() => setMode("signup")}
            />
          ) : (
            <SignupForm
              callbackUrl={callbackUrl}
              onSuccess={close}
              onSwitchToLogin={() => setMode("login")}
            />
          )}

          <ProviderButtons callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
