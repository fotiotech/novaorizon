"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Menu,
  NavigateNext,
  Person,
  Search,
  ShoppingCart,
  Close,
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import useClickOutside from "./Hooks";
import { Category } from "@/constant/types";
import { useCart } from "@/app/context/CartContext";
import { getCategory } from "@/app/actions/category";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { getMenusByLocation, MenuData } from "@/app/actions/menu";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";

// ---------- SearchBar ----------
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

// ---------- UserProfile ----------
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

// ---------- CartIcon ----------
const CartIcon = React.memo(() => {
  const { cart } = useCart();

  return (
    <span className="relative">
      {cart.length > 0 && (
        <p className="absolute right-0 -top-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1 min-w-[18px] text-center">
          {cart.length}
        </p>
      )}
      <Link href={"/cart"}>
        <ShoppingCart style={{ fontSize: 30 }} />
      </Link>
    </span>
  );
});

CartIcon.displayName = "CartIcon";

// ---------- Sidebar ----------
const Sidebar = React.memo(
  ({
    isOpen,
    onClose,
    categories,
  }: {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
  }) => {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}

        <div
          className={`fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 flex justify-between items-center border-b border-border">
            <Link href={`/category`}>
              <h2 className="text-xl font-semibold text-foreground">
                Categories
              </h2>
            </Link>

            <button
              title="category"
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted"
            >
              <Close />
            </button>
          </div>

          <div className="overflow-y-auto h-full pb-20">
            <ul className="py-4">
              {categories.slice(0, 15).map((category, index) => (
                <li key={index} className="border-b border-border">
                  <Link
                    href={`/category?id=${category._id}`}
                    className="block py-3 px-6 hover:bg-muted transition-colors text-foreground"
                    onClick={onClose}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="px-6 py-4">
              <h3 className="font-medium mb-2 text-foreground">
                Customer Support
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/help"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={onClose}
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={onClose}
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={onClose}
                  >
                    Returns & Refunds
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";

// ---------- Main Header ----------
const Header = () => {
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState<
    Array<{ _id: string; name: string }>
  >([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch categories (for sidebar and fallback)
        const categoriesRes = await getCategory();
        setCategory(categoriesRes);

        // Fetch NavBar menus (location === "NavBar")
        const navBarMenusRes = await getMenusByLocation("NavBar");
        if (navBarMenusRes.success && navBarMenusRes.data.length > 0) {
          // Assuming the first menu is the main navigation bar
          const firstMenu = navBarMenusRes.data[0];
          // Use populatedContent if available, otherwise fallback to content IDs
          if (
            firstMenu.populatedContent &&
            firstMenu.populatedContent.length > 0
          ) {
            setNavItems(
              firstMenu.populatedContent.map((item: any) => ({
                _id: item._id,
                name: item.name,
              })),
            );
          } else {
            // If no populated content, fallback to empty
            setNavItems([]);
          }
        } else {
          // If no NavBar menu, fallback to categories (first 10)
          setNavItems([]);
        }
      } catch (error) {
        console.error("Error fetching navigation data:", error);
      }
    }

    fetchData();
  }, []);

  const domNode = useClickOutside(() => setShowSearchBox(false));
  const sidebarRef = useClickOutside(() => setIsSidebarOpen(false));

  // Memoize navigation items (from NavBar menu or fallback categories)
  const navigationItems = useMemo(() => {
    // If we have NavBar items, use them
    if (navItems.length > 0) {
      return navItems.map((item) => (
        <li key={item._id} className="inline-block pt-2 px-2">
          <Link
            href={`/${item.name.toLowerCase().replace(/\s+/g, "-")}/${item._id}`}
            className="text-foreground hover:text-primary"
          >
            {item.name}
          </Link>
        </li>
      ));
    }

    // Fallback: use first 10 categories
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
        window.location.href = `/search?query=${encodeURIComponent(
          searchInput,
        )}`;
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
      />
    </>
  );
};

export default React.memo(Header);
