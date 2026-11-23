// components/Header.tsx
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
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
/**
 * Per-session shipping label cache.
 *
 * Kept in memory rather than `unstable_cache` because the address request
 * needs the request's session cookie (dynamic API), which Next forbids inside
 * a cache callback. The key is a hash of the session token, never the token.
 */
const SHIPPING_TTL_MS = 60_000;
const shippingCache = new Map<
  string,
  { value: { signedIn: boolean; location: string | null }; expires: number }
>();

async function getShippingState(): Promise<{
  signedIn: boolean;
  location: string | null;
}> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return { signedIn: false, location: null };

  const key = crypto.createHash("sha256").update(token).digest("hex").slice(0, 24);
  const hit = shippingCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  let value: { signedIn: boolean; location: string | null };
  try {
    const addresses = await apiData<any[]>("/addresses");
    let location: string | null = null;
    if (Array.isArray(addresses) && addresses.length > 0) {
      const address =
        addresses.find((a) => a?.isDefault === true) ?? addresses[0];
      location =
        [address?.city, address?.country].filter(Boolean).join(", ") || null;
    }
    value = { signedIn: true, location };
  } catch (err: any) {
    value = { signedIn: err?.status !== 401, location: null };
  }

  shippingCache.set(key, { value, expires: Date.now() + SHIPPING_TTL_MS });
  return value;
}

export default async function Header() {
  const { navMenu, sidebarMenus } = await getHeaderData();

  const { signedIn, location: shippingLocation } =
    await getShippingState();

  return (
    <HeaderClient
      navMenu={navMenu}
      sidebarMenus={sidebarMenus}
      signedIn={signedIn}
      shippingLocation={shippingLocation}
    />
  );
}