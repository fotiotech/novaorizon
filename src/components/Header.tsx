// components/Header.tsx
import { unstable_cache } from "next/cache";
import HeaderClient from "./HeaderClient";
import { getCategory } from "@/app/actions/category";
import { getMenusByLocation } from "@/app/actions/menu";
import type { Category } from "@/constant/types";

// ---------- Types shared with the client ----------
export interface NavItem {
  _id: string;
  name: string;
  href: string;
}

export interface HeaderData {
  categories: Category[];
  navItems: NavItem[];
  sidebarMenus: any[];
}

// ---------- Helpers ----------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getItemHref(item: {
  _id: string;
  name: string;
  contentType: string;
}): string {
  const slug = slugify(item.name);
  const prefix = (item.contentType || "Product").toLowerCase() + "s";
  return `/${prefix}/${slug}/${item._id}`;
}

// ---------- Cached loader ----------
// Nav data changes rarely. Cache it for 1 hour, and purge it on-demand
// from your admin/menu actions with revalidateTag("header-nav").
const getHeaderData = unstable_cache(
  async (): Promise<HeaderData> => {
    try {
      const [categoriesRes, navRes, sidebarRes] = await Promise.all([
        getCategory(),
        getMenusByLocation("NavBar"),
        getMenusByLocation("SideBar"),
      ]);

      const categories: any[] = Array.isArray(categoriesRes)
        ? categoriesRes
        : [];

      let navItems: NavItem[] = [];

      // Primary source: the NavBar menu configured in admin.
      if (
        navRes?.success &&
        Array.isArray(navRes.data) &&
        navRes.data[0]?.items?.length
      ) {
        navItems = navRes.data[0].items.map((item: any) => ({
          _id: item._id,
          name: item.name || item.title || "Unnamed",
          href: getItemHref({
            _id: item._id,
            name: item.name || item.title || "Unnamed",
            contentType: item.contentType || "Product",
          }),
        }));
      } else {
        // Fallback: top categories.
        navItems = categories.slice(0, 10).map((cat) => ({
          _id: cat._id,
          name: cat.name,
          href: `/category/${cat.url_slug}/${cat._id}`,
        }));
      }

      const sidebarMenus =
        sidebarRes?.success && Array.isArray(sidebarRes.data)
          ? sidebarRes.data
          : [];

      return { categories, navItems, sidebarMenus };
    } catch (err) {
      console.error("[Header] Failed to load nav data:", err);
      // Never blow up the whole layout for a nav fetch failure.
      return { categories: [], navItems: [], sidebarMenus: [] };
    }
  },
  ["header-nav"], // cache key
  {
    revalidate: 3600, // 1 hour safety net
    tags: ["header-nav"], // purge with revalidateTag("header-nav")
  },
);

// ---------- Server Component ----------
export default async function Header() {
  const { categories, navItems, sidebarMenus } = await getHeaderData();

  return (
    <HeaderClient
      categories={categories}
      navItems={navItems}
      sidebarMenus={sidebarMenus}
    />
  );
}
