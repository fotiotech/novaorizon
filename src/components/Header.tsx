"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Menu, Person, Search, ShoppingCart } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Category } from "@/constant/types";
import { useCart } from "@/app/context/CartContext";
import { getCategory } from "@/app/actions/category";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { getMenusByLocation } from "@/app/actions/menu";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";
import Sidebar from "./Sidebar";
import SearchModal from "./ui/SearchModal";
import DesktopSearchBar from "./ui/DesktopSearchBar";

// ---------- Logo sources ----------
const LOGO_DARK = "/logoc1.png";

// ---------- UserProfile ----------
const UserProfile = React.memo(() => {
  const session = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;

  if (!user) return <SignIn />;

  return (
    <Link
      href="/profile"
      className="flex items-center gap-1.5 rounded-md text-sm text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Profile"
    >
      <span className="font-semibold hidden sm:inline">{user?.name}</span>
      <div className="relative">
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount}
          </span>
        )}
        <Person
          style={{ fontSize: 28 }}
          className="text-foreground transition-transform hover:scale-110"
        />
      </div>
    </Link>
  );
});

UserProfile.displayName = "UserProfile";

// ---------- CartIcon ----------
const CartIcon = React.memo(() => {
  const { items } = useCart();
  const itemCount = items?.length ?? 0;

  return (
    <div className="relative transition-transform hover:scale-110">
      {itemCount > 0 && (
        <span
          className="absolute -right-1 -top-1 min-w-[18px] z-10 rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
          aria-label={`${itemCount} items in cart`}
        >
          {itemCount}
        </span>
      )}
      <Link
        href="/cart"
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Shopping cart"
      >
        <ShoppingCart style={{ fontSize: 28 }} className="text-foreground" />
      </Link>
    </div>
  );
});

CartIcon.displayName = "CartIcon";

// ---------- Logo ----------
const Logo = React.memo(() => (
  <Link
    href="/"
    className="relative flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    aria-label="Homepage"
  >
    <Image
      src={LOGO_DARK}
      width={100}
      height={100}
      alt="Novaorizon"
      priority
      className="h-auto w-auto"
    />
  </Link>
));

Logo.displayName = "Logo";

// ---------- Helper ----------
function getItemHref(item: { _id: string; name: string; contentType: string }) {
  const slug = item.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = item.contentType.toLowerCase() + "s";

  return `/${prefix}/${slug}/${item._id}`;
}

// ---------- Main Header ----------
const Header = () => {
  const pathname = usePathname();
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navItems, setNavItems] = useState<
    Array<{ _id: string; name: string; contentType: string }>
  >([]);
  const [sidebarMenus, setSidebarMenus] = useState<any[]>([]);
  const [isAtTop, setIsAtTop] = useState(true);

  const isHomePage = pathname === "/";

  // Fetch nav data
  useEffect(() => {
    async function fetchData() {
      try {
        const categoriesRes = await getCategory();
        setCategory(categoriesRes);

        const navBarMenusRes = await getMenusByLocation("NavBar");
        if (navBarMenusRes.success && navBarMenusRes.data.length > 0) {
          const firstMenu = navBarMenusRes.data[0];

          if (firstMenu.items && firstMenu.items.length > 0) {
            setNavItems(
              firstMenu.items.map((item: any) => ({
                _id: item._id,
                name: item.name || item.title || "Unnamed",
                contentType: item.contentType || "Product",
              })),
            );
          }
        }

        const sideBarMenusRes = await getMenusByLocation("SideBar");
        if (sideBarMenusRes.success && sideBarMenusRes.data.length > 0) {
          setSidebarMenus(sideBarMenusRes.data);
        }
      } catch (error) {
        console.error("Error fetching navigation data:", error);
      }
    }

    fetchData();
  }, []);

  // Scroll detection (used to toggle the navbar row on the home page)
  useEffect(() => {
    const onScroll = () => setIsAtTop(window.scrollY < 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigationItems = useMemo(() => {
    // Navbar is home-only; skip all work on every other route.
    if (!isHomePage) return null;

    const itemsToRender =
      navItems.length > 0
        ? navItems
        : category.slice(0, 10).map((cat) => ({
            _id: cat._id,
            name: cat.name,
            contentType: "Category",
            href: `/category/${cat.url_slug}/${cat._id}`,
          }));

    return itemsToRender.map((item) => {
      const href =
        item.contentType === "Category"
          ? (item as any).href
          : getItemHref(item as any);

      return (
        <li key={item._id} className="inline-block">
          <Link
            href={href}
            className="block rounded-lg p-2 text-base font-medium text-foreground transition-all duration-200 hover:bg-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {item.name}
          </Link>
        </li>
      );
    });
  }, [navItems, category, isHomePage]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <>
      <header
        role="banner"
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-border shadow-sm backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-2 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-1">
            {/* Left: menu + logo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                className="rounded-full p-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Menu style={{ fontSize: 28 }} className="text-foreground" />
              </button>
              <Logo />
            </div>

            {/* Middle: desktop inline search (no modal) */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <DesktopSearchBar isTransparent={false} />
            </div>

            {/* Spacer on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Right: mobile search icon → modal, then user + cart */}
            <div className="flex items-center gap-2 lg:gap-3">
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search"
                className="lg:hidden rounded-full p-2 transition-colors hover:bg-muted"
              >
                <Search style={{ fontSize: 26 }} className="text-foreground" />
              </button>
              <UserProfile />
              <CartIcon />
            </div>
          </div>

          {/* Navbar row — visible on home page only while at the top */}
          <div
            className={`w-full overflow-hidden transition-all duration-300 ${
              isHomePage && isAtTop
                ? "max-h-16 opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="overflow-x-auto scrollbar-none pb-1">
              <nav aria-label="Main navigation">
                <ul className="flex items-center gap-0.5 whitespace-nowrap">
                  {navigationItems}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        categories={category}
        sidebarMenus={sidebarMenus}
      />

      {/* Search modal — mobile only */}
      <div className="lg:hidden">
        <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
      </div>
    </>
  );
};

export default React.memo(Header);
