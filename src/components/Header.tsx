"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Menu,
  NavigateNext,
  Person,
  Search,
  ShoppingCart,
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import useClickOutside from "./Hooks";
import { Category } from "@/constant/types";
import { useCart } from "@/app/context/CartContext";
import { getCategory } from "@/app/actions/category";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { getMenusByLocation } from "@/app/actions/menu";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";
import Sidebar from "./Sidebar";

// ---------- SearchBar (enhanced) ----------
const SearchBar = React.memo(
  ({
    searchInput,
    setSearchInput,
    isMobile = false,
    onSubmit,
  }: {
    searchInput: string;
    setSearchInput: (value: string) => void;
    isMobile?: boolean;
    onSubmit: (e: React.FormEvent) => void;
  }) => {
    return (
      <form
        className={`flex items-center h-11 bg-background rounded-full overflow-hidden border border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all ${
          isMobile ? "w-full" : "w-full"
        }`}
        onSubmit={onSubmit}
      >
        <input
          title="search"
          type="text"
          name="searchInput"
          value={searchInput}
          placeholder="Search Dyfk"
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 h-full bg-transparent py-2 focus:outline-none border-none px-4 leading-tight text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          title="Search"
          className="btn py-2 px-4 m-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search style={{ fontSize: 20 }} />
        </button>
      </form>
    );
  },
);
SearchBar.displayName = "SearchBar";

// ---------- UserProfile (enhanced) ----------
const UserProfile = React.memo(() => {
  const session = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <Link
          href="/profile"
          className="text-foreground hover:text-primary transition-colors"
        >
          <span className="hidden sm:inline">{user?.name}</span>
        </Link>
      ) : (
        <SignIn />
      )}
      <span className="text-muted-foreground">
        <NavigateNext style={{ fontSize: 16 }} />
      </span>
      <div className="relative">
        {unreadCount > 0 && (
          <p className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
            {unreadCount}
          </p>
        )}
        <Link href="/profile" className="hover:scale-110 transition-transform">
          <Person style={{ fontSize: 28 }} className="text-foreground" />
        </Link>
      </div>
    </div>
  );
});
UserProfile.displayName = "UserProfile";

// ---------- CartIcon (enhanced) ----------
const CartIcon = React.memo(() => {
  const { items } = useCart();
  const itemCount = items?.length ?? 0;

  return (
    <div className="relative hover:scale-110 transition-transform">
      {itemCount > 0 && (
        <p className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
          {itemCount}
        </p>
      )}
      <Link href="/cart">
        <ShoppingCart style={{ fontSize: 28 }} className="text-foreground" />
      </Link>
    </div>
  );
});
CartIcon.displayName = "CartIcon";

// ---------- Helper: build dynamic route ----------
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
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState<
    Array<{ _id: string; name: string; contentType: string }>
  >([]);
  const [sidebarMenus, setSidebarMenus] = useState<any[]>([]);

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

  const domNode = useClickOutside(() => setShowSearchBox(false));
  const sidebarRef = useClickOutside(() => setIsSidebarOpen(false));

  const navigationItems = useMemo(() => {
    const itemsToRender =
      navItems.length > 0
        ? navItems
        : category.slice(0, 10).map((cat) => ({
            _id: cat._id,
            name: cat.name,
            contentType: "Category",
            href: `/category?id=${cat._id}`,
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
            className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-muted rounded-lg transition-all duration-200"
          >
            {item.name}
          </Link>
        </li>
      );
    });
  }, [navItems, category]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchInput.trim()) {
        window.location.href = `/search?query=${encodeURIComponent(searchInput)}`;
      }
    },
    [searchInput],
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-4 lg:px-10 py-2">
          {/* Top row */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                title="Toggle sidebar"
                type="button"
                onClick={toggleSidebar}
                className="hover:bg-muted py-2 rounded-full transition-colors"
              >
                <Menu style={{ fontSize: 28 }} className="text-foreground" />
              </button>
              <Link href="/" className="flex-shrink-0">
                <Image
                  src="/logo.png"
                  width={60}
                  height={30}
                  alt="logo"
                  priority
                  className="h-auto w-auto"
                />
              </Link>
            </div>

            <div className="hidden lg:block flex-1 max-w-2xl">
              <SearchBar
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSubmit={handleSearchSubmit}
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                title="Search"
                type="button"
                className="lg:hidden hover:bg-muted p-2 rounded-full transition-colors"
                onClick={() => setShowSearchBox((prev) => !prev)}
              >
                <Search style={{ fontSize: 24 }} className="text-foreground" />
              </button>
              <UserProfile />
              <CartIcon />
            </div>
          </div>

          {/* Mobile search (expanded) */}
          <div
            ref={domNode}
            className={`${
              showSearchBox ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0"
            } overflow-hidden transition-all duration-300 ease-in-out lg:hidden`}
          >
            <div className="pb-2">
              <SearchBar
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                isMobile={true}
                onSubmit={handleSearchSubmit}
              />
            </div>
          </div>

          {/* Navigation bar */}
          <div className=" border-border pt-2 overflow-x-auto scrollbar-none">
            <ul className="flex items-center gap-1 whitespace-nowrap">
              {navigationItems}
            </ul>
          </div>
        </div>
      </header>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        categories={category}
        sidebarMenus={sidebarMenus}
      />
    </>
  );
};

export default React.memo(Header);
