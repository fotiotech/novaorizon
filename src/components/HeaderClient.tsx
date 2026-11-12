// components/HeaderClient.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Menu, Person, Search, ShoppingCart } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { useUnreadMessages } from "@/app/(root)/checkout/chat/_component/useUnreadMessages";
import Sidebar from "./Sidebar";
import SearchModal from "./ui/SearchModal";
import DesktopSearchBar from "./ui/DesktopSearchBar";
import CartPopover from "./cart/CartPopover";
import {
  NavTree,
  type NavItem,
  type NavMenu,
  type NavMenuConfig,
} from "@/components/menu/NavTree";
import ProfilePopover from "@/app/(root)/profile/components/ux/ProfilePopover";

// Re-export so `components/Header.tsx` (and anything else) can keep
// importing these types from "@/components/HeaderClient" unchanged.
export type { NavItem, NavMenu, NavMenuConfig };

// ---------- Logo sources ----------
const LOGO_DARK = "/novaorizon.png";

interface HeaderClientProps {
  navMenu: NavMenu | null;
  sidebarMenus: any[];
}

/* -------------------------------------------------------------------------- */
/*                                  Logo                                      */
/* -------------------------------------------------------------------------- */

const Logo = React.memo(() => (
  <Link
    href="/"
    className="relative flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-foreground/60"
    aria-label="Homepage"
  >
    <Image
      src={LOGO_DARK}
      width={124}
      height={124}
      alt="Novaorizon"
      priority
      className="h-auto w-auto"
    />
  </Link>
));
Logo.displayName = "Logo";

/* -------------------------------------------------------------------------- */
/*                             UserProfile                                    */
/* -------------------------------------------------------------------------- */

const UserProfile = React.memo(() => {
  const session = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const togglePopover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => setIsPopoverOpen(false);

  if (!user) return <SignIn />;

  return (
    <div ref={wrapperRef} className="relative">
      <Link
        href="/profile"
        onClick={togglePopover}
        className="flex items-center gap-1.5 rounded-md text-base text-primary-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/60"
        aria-label="Profile"
        aria-haspopup="dialog"
        aria-expanded={isPopoverOpen}
      >
        <span className="hidden font-semibold sm:inline">{user?.name}</span>
        <div className="relative">
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 z-10 min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-[11px] font-bold leading-[20px] text-destructive-foreground"
              aria-label={`${unreadCount} unread messages`}
            >
              {unreadCount}
            </span>
          )}
          {user?.image ? (
            <img
              src={user.image}
              alt={user?.name ?? "Profile"}
              className="h-8 w-8 rounded-full object-cover border border-primary-foreground/30 transition-transform hover:scale-110"
            />
          ) : (
            <Person
              style={{ fontSize: 32 }}
              className="text-primary-foreground transition-transform hover:scale-110"
            />
          )}
        </div>
      </Link>

      <ProfilePopover
        open={isPopoverOpen}
        onClose={closePopover}
        anchorRef={wrapperRef}
      />
    </div>
  );
});
UserProfile.displayName = "UserProfile";

/* -------------------------------------------------------------------------- */
/*                               CartIcon                                     */
/* -------------------------------------------------------------------------- */

const CartIcon = React.memo(() => {
  const { items } = useCart();
  const itemCount = items?.length ?? 0;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCartClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (itemCount < 5) {
      e.preventDefault();
      setIsPopoverOpen((prev) => !prev);
    }
  };

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <div ref={wrapperRef} className="relative ">
      {itemCount > 0 && (
        <span
          className="absolute -right-1 -top-1 z-10 min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-[11px] font-bold leading-[20px] text-destructive-foreground"
          aria-label={`${itemCount} items in cart`}
        >
          {itemCount}
        </span>
      )}

      <Link
        href="/cart"
        onClick={handleCartClick}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-foreground/60"
        aria-label="Shopping cart"
      >
        <ShoppingCart
          style={{ fontSize: 32 }}
          className="text-primary-foreground"
        />
      </Link>

      <CartPopover
        open={isPopoverOpen}
        onClose={closePopover}
        anchorRef={wrapperRef}
      />
    </div>
  );
});
CartIcon.displayName = "CartIcon";

/* -------------------------------------------------------------------------- */
/*                               HeaderClient                                 */
/* -------------------------------------------------------------------------- */

const HeaderClient = ({ navMenu, sidebarMenus }: HeaderClientProps) => {
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Track scroll position to know if we're at the very top of the page.
  // The nav is only rendered on the home page AND when the user is at the
  // top (any scroll up or down hides it again).
  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY < 4);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const displayConfig = useMemo<NavMenuConfig>(
    () => navMenu?.displayConfig ?? {},
    [navMenu?.displayConfig],
  );

  const hasNav = !!navMenu && navMenu.items.length > 0;
  const isHome = pathname === "/";
  const showNav = hasNav && isHome && isAtTop;

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-50 m-1 pr-2 lg:mx-6 lg:p-3 border border-primary-700/40 rounded-xl bg-primary-600 text-primary-foreground shadow-sm"
      >
        <div className=" ">
          <div className="flex items-center justify-between gap-3 py-1">
            {/* Left: menu + logo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary-foreground/60"
              >
                <Menu
                  style={{ fontSize: 32 }}
                  className="text-primary-foreground"
                />
              </button>
              <Logo />
            </div>

            {/* Middle: desktop inline search — uses the on-primary variant */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <DesktopSearchBar isTransparent />
            </div>

            {/* Right: search (mobile), user, cart */}
            <div className="flex items-center gap-1 lg:gap-3">
              {/* Mobile-only search icon — opens the search modal */}
              <button
                type="button"
                onClick={openSearch}
                aria-label="Open search"
                className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary-foreground/60 lg:hidden"
              >
                <Search
                  style={{ fontSize: 32 }}
                  className="text-primary-foreground"
                />
              </button>

              <div className="flex items-center gap-3">
                <UserProfile />
                <CartIcon />
              </div>
            </div>
          </div>

          {/* Nav menu — home page only, and only while at the top.
              Root links are forced to primary-foreground via arbitrary
              variants so they remain legible on the navy header. Dropdown
              panels (nested `ul`s) are untouched and keep their light card
              styling. */}
          {showNav ? (
            <div className="relative w-full overflow-x-auto md:overflow-visible scrollbar-hide">
              <nav
                aria-label="Main navigation"
                className="w-max min-w-full md:w-full
                  [&>ul>li>a]:text-primary-foreground
                  [&>ul>li>a:hover]:bg-primary-foreground/10
                  [&>ul>li>a:hover]:text-primary-foreground
                  [&>ul>li>a:focus-visible]:ring-primary-foreground/60"
              >
                <NavTree
                  items={navMenu.items}
                  config={displayConfig}
                  menuDisplay={navMenu.display ?? "horizontal"}
                />
              </nav>
            </div>
          ) : null}
        </div>
      </header>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        sidebarMenus={sidebarMenus}
      />

      {/* Search modal — mobile only */}
      <div className="lg:hidden">
        <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
      </div>
    </>
  );
};

export default React.memo(HeaderClient);
