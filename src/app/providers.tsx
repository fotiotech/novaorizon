"use client";

import React, { useMemo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "./context/CartContext";
import { UserDataProvider } from "./context/UserDataContext";
import { SessionObserver } from "@/components/SessionObserver";
import { AuthProvider } from "@/hooks/useAuth";

interface ProviderProps {
  children: ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SessionObserver />
        <UserDataProvider>
          <CartProvider>{children}</CartProvider>
        </UserDataProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default Providers;