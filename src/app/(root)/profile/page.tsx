// app/profile/page.tsx
import type { Metadata } from "next";
import ProfileClient from "./components/ProfileClient";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your Novaorizon account, orders, and preferences.",
  // Authenticated page — never index. `follow: false` because the page
  // contains no links Google needs to discover (product/category links
  // are already crawlable elsewhere).
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  // No canonical — contradictory with noindex.
};

export default function ProfilePage() {
  return <ProfileClient />;
}
