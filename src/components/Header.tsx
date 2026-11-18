// components/Header.tsx
import { unstable_cache } from "next/cache";
import HeaderClient, {
  type NavMenu,
  type NavItem,
  type NavMenuConfig,
} from "./HeaderClient";
import { apiData } from "@/lib/server-api";

// ---------- Types shared with the client ----------
export interface HeaderData {
  navMenu: NavMenu | null;
  sidebarMenus: any[];
}

// ---------- Helpers ----------

/**
 * Pick the active NavBar menu and shape it into the tree the client renders.
 * The action already filters out `visible: false` menus and sorts by
 * `order` then `createdAt`, so the first result is the winner.
 */
function pickNavMenu(menus: any[]): NavMenu | null {
  const menu = menus[0];
  if (!menu?.items?.length) return null;

  return {
    items: menu.items as NavItem[],
    display: menu.display ?? "horizontal",
    displayConfig: (menu.displayConfig ?? {}) as NavMenuConfig,
  };
}

// ---------- Cached loader ----------
// Nav data changes rarely. Cache it for 1 hour, and purge it on-demand
// from admin/menu actions with revalidateTag("header-nav").
const getHeaderData = unstable_cache(
  async (): Promise<HeaderData> => {
    try {
      // 5-minute data-cache window: admin menu edits (which can no longer call
      // `revalidateTag` from the browser) show up without waiting an hour, and
      // `force-cache` is avoided because it would pin the response forever.
      const [navMenus, sidebarMenus] = await Promise.all([
        apiData<any[]>("/menus/location/NavBar", { revalidate: 300 }),
        apiData<any[]>("/menus/location/SideBar", { revalidate: 300 }),
      ]);

      const navMenu = Array.isArray(navMenus) ? pickNavMenu(navMenus) : null;

      return { navMenu, sidebarMenus };
    } catch (err) {
      console.error("[Header] Failed to load nav data:", err);
      // Never blow up the whole layout for a nav fetch failure.
      return { navMenu: null, sidebarMenus: [] };
    }
  },
  ["header-nav"], // cache key
  {
    revalidate: 300, // keep in step with the API data-cache window
    tags: ["header-nav"], // purge with revalidateTag("header-nav")
  },
);

// ---------- Server Component ----------
export default async function Header() {
  const { navMenu, sidebarMenus } = await getHeaderData();

  return <HeaderClient navMenu={navMenu} sidebarMenus={sidebarMenus} />;
}