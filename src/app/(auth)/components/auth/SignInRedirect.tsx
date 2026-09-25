"use client";

import { useEffect } from "react";
import { useAuthModal } from "@/app/context/AuthModalContext";
import { useRouter } from "next/navigation";

export function SignInRedirect({ callbackUrl }: { callbackUrl: string }) {
  const { openLogin } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    openLogin(callbackUrl);
    router.replace("/");
  }, [openLogin, router, callbackUrl]);

  return null;
}
