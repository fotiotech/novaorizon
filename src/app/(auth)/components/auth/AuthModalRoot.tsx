"use client";

import { ReactNode } from "react";
import { AuthModalProvider } from "@/app/context/AuthModalContext";
import { AuthModal } from "./AuthModal";

export function AuthModalRoot({ children }: { children: ReactNode }) {
  return (
    <AuthModalProvider>
      {children}
      <AuthModal />
    </AuthModalProvider>
  );
}
