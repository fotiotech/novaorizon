import { verifySession } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import { AdminLayout } from "../components";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await verifySession();
  const userRole = session?.role;

  // If there is no token, redirect to login page
  if (userRole !== "admin") {
    return redirect("/auth/login");
  }

  return (
    <div>
      <AdminLayout>{children}</AdminLayout>
    </div>
  );
}
