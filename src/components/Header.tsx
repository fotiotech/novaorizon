"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Menu, Person, Search, ShoppingCart } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
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
import ProfilePopover from "@/app/(profile)/components/ux/ProfilePopover";
import CartPopover from "./cart/CartPopover";

// ---------- Logo sources ----------
const LOGO_DARK = "/logoc1.png";

// ---------- UserProfile with Popover ----------
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

  // Signed-out: show the sign-in button, no popover.
  if (!user) return <SignIn />;

  return (
    <div ref={wrapperRef} className="relative">
      <Link
        href="/profile"
        onClick={togglePopover}
        className="flex items-center gap-1.5 rounded-md text-sm text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Profile"
        aria-haspopup="dialog"
        aria-expanded={isPopoverOpen}
      >
        <span className="hidden font-semibold sm:inline">{user?.name}</span>
        <div className="relative">
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 z-10 min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
              aria-label={`${unreadCount} unread messages`}
            >
              {unreadCount}
            </span>
          )}
          {user?.image ? (
            <Image
              src={user.image}
              alt={user?.name ?? "Profile"}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover border border-border transition-transform hover:scale-110"
            />
          ) : (
            <Person
              style={{ fontSize: 28 }}
              className="text-foreground transition-transform hover:scale-110"
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

// ---------- CartIcon with Popover ----------
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
    <div ref={wrapperRef} className="relative">
      {itemCount > 0 && (
        <span
          className="absolute -right-1 -top-1 z-10 min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
          aria-label={`${itemCount} items in cart`}
        >
          {itemCount}
        </span>
      )}

      <Link
        href="/cart"
        onClick={handleCartClick}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Shopping cart"
      >
        <ShoppingCart style={{ fontSize: 28 }} className="text-foreground" />
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
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navItems, setNavItems] = useState<
    Array<{ _id: string; name: string; contentType: string }>
  >([]);
  const [sidebarMenus, setSidebarMenus] = useState<any[]>([]);

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

  const navigationItems = useMemo(() => {
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
  }, [navItems, category]);

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
          <div className="flex items-center justify-between gap-3 py-2">
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

            {/* Middle: desktop inline search */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <DesktopSearchBar isTransparent={false} />
            </div>

            {/* Spacer on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Right: mobile search, user, cart */}
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

          {/* Navbar row */}
          <div className="w-full overflow-hidden">
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
