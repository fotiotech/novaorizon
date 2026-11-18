"use client";

import React, { useMemo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { CartProvider } from "./context/CartContext";
import { store } from "./store/store";
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
        <ReduxProvider store={store}>
          <SessionObserver />
          <UserDataProvider>
            <CartProvider>{children}</CartProvider>
          </UserDataProvider>
          {/* </PersistGate> */}
        </ReduxProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default Providers;
