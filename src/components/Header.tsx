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

// ---------- SearchBar (unchanged) ----------
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
        className={`flex items-center h-11 bg-background rounded-xl overflow-hidden ${
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
          className="flex-1 h-full bg-none py-2 focus:outline-none 
                 border-none px-3 leading-tight text-foreground bg-background"
        />
        <button
          type="submit"
          title="Search"
          className="btn py-1 px-3 m-1 rounded-xl"
        >
          <Search style={{ color: "#fff" }} />
        </button>
      </form>
    );
  },
);
SearchBar.displayName = "SearchBar";

// ---------- UserProfile (unchanged) ----------
const UserProfile = React.memo(() => {
  const session = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;

  return (
    <div className="flex items-center">
      {user ? (
        <Link href={"/profile"}>
          <p className="text-foreground">{user?.name}</p>
        </Link>
      ) : (
        <SignIn />
      )}
      <span>
        <NavigateNext style={{ fontSize: 16 }} />
      </span>
      <div className="relative">
        {unreadCount > 0 && (
          <p className="absolute right-0 -top-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1 min-w-[18px] text-center">
            {unreadCount}
          </p>
        )}
        <Link href={"/profile"}>
          <Person style={{ fontSize: 30 }} />
        </Link>
      </div>
    </div>
  );
});
UserProfile.displayName = "UserProfile";

// ---------- CartIcon – UPDATED to use items (not cart) ----------
const CartIcon = React.memo(() => {
  const { items } = useCart(); // ✅ Changed from { cart } to { items }
  const itemCount = items?.length ?? 0;

  return (
    <span className="relative">
      {itemCount > 0 && (
        <p className="absolute right-0 -top-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1 min-w-[18px] text-center">
          {itemCount}
        </p>
      )}
      <Link href={"/cart"}>
        <ShoppingCart style={{ fontSize: 30 }} />
      </Link>
    </span>
  );
});
CartIcon.displayName = "CartIcon";

// ---------- Helper: build dynamic route from item ----------
function getItemHref(item: { _id: string; name: string; contentType: string }) {
  const slug = item.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = item.contentType.toLowerCase() + "s"; // e.g., products, collections
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
    if (navItems.length > 0) {
      return navItems.map((item) => (
        <li key={item._id} className="inline-block pt-2 px-2">
          <Link
            href={getItemHref(item)}
            className="text-foreground hover:text-primary"
          >
            {item.name}
          </Link>
        </li>
      ));
    }

    return category.slice(0, 10).map((cat) => (
      <li key={cat._id} className="inline-block pt-2 px-2">
        <Link
          href={`/category?id=${cat._id}`}
          className="text-foreground hover:text-primary"
        >
          {cat.name}
        </Link>
      </li>
    ));
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
      <div className="p-2 lg:px-10 bg-background text-foreground sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button title="toggle" type="button" onClick={toggleSidebar}>
              <Menu style={{ fontSize: 30 }} />
            </button>
            <Link href={"/"}>
              <Image
                src={"/logo.png"}
                width={60}
                height={30}
                alt="logo"
                priority
              />
            </Link>
          </div>

          <div className="hidden lg:block w-3/4">
            <div className="relative w-full">
              <SearchBar
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSubmit={handleSearchSubmit}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="lg:hidden">
              <Search
                onClick={() => setShowSearchBox((prev) => !prev)}
                style={{ cursor: "pointer" }}
              />
            </span>
            <UserProfile />
            <CartIcon />
          </div>
        </div>

        <div
          ref={domNode}
          className={`${
            showSearchBox ? "w-full h-auto mt-2" : "w-0 h-0 overflow-hidden"
          } transition-all lg:hidden`}
        >
          <div className="relative w-full">
            <SearchBar
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              isMobile={true}
              onSubmit={handleSearchSubmit}
            />
          </div>
        </div>

        <div className="mt-2">
          <ul className="whitespace-nowrap overflow-auto scrollbar-none">
            {navigationItems}
          </ul>
        </div>
      </div>

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
