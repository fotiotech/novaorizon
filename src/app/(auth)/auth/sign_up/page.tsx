// app/auth/sign_up/page.tsx
import type { Metadata } from "next";
import SignupForm from "../../components/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a Novaorizon account to track orders and check out faster.",
  // Never index auth pages. `follow: true` lets Google follow links
  // (Terms, Privacy) from this page without indexing the page itself.
  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
  // No canonical — it is contradictory with noindex.
};

export default function SignupPage() {
  return <SignupForm />;
}
