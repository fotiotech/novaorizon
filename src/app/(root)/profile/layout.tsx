// app/profile/layout.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authz";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login?callbackUrl=/profile");
  return <>{children}</>;
}
