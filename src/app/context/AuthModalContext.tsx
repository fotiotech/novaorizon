"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

export type AuthMode = "login" | "signup";

interface AuthModalValue {
  isOpen: boolean;
  mode: AuthMode;
  callbackUrl: string;
  openLogin: (callbackUrl?: string) => void;
  openSignup: (callbackUrl?: string) => void;
  close: () => void;
  setMode: (m: AuthMode) => void;
}

const AuthModalContext = createContext<AuthModalValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [callbackUrl, setCallbackUrl] = useState<string>("/");

  const openLogin = useCallback((url: string = "/") => {
    setMode("login");
    setCallbackUrl(url);
    setIsOpen(true);
  }, []);

  const openSignup = useCallback((url: string = "/") => {
    setMode("signup");
    setCallbackUrl(url);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        callbackUrl,
        openLogin,
        openSignup,
        close,
        setMode,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx)
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  return ctx;
}

/** Non-throwing variant for shared UI that may render outside the provider. */
export function useAuthModalOptional() {
  return useContext(AuthModalContext) ?? null;
}
