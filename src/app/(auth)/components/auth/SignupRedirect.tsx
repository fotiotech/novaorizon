"use client";

import { useEffect } from "react";
import { useAuthModal } from "@/app/context/AuthModalContext";
import { useRouter } from "next/navigation";

export function SignupRedirect({ callbackUrl }: { callbackUrl: string }) {
  const { openSignup } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    openSignup(callbackUrl);
    router.replace("/");
  }, [openSignup, router, callbackUrl]);

  return null;
}
