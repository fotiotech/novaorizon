"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Menu,
  NavigateNext,
  Person,
  Search,
  ShoppingCart,
} from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useClickOutside from "./Hooks";
import { Category } from "@/constant/types";
import { useCart } from "@/app/context/CartContext";
import { getCategory } from "@/app/actions/category";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { getMenusByLocation } from "@/app/actions/menu";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";
import Sidebar from "./Sidebar";
import ImageRenderer from "./ImageRenderer";
import { debounce } from "@/app/(search)/search/_component/debounce";

// ---------- SearchBar with Autocomplete Dropdown ----------
const SearchBarWithAutocomplete = React.memo(
  ({
    searchInput,
    setSearchInput,
    onSearchSubmit,
  }: {
    searchInput: string;
    setSearchInput: (value: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
  }) => {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const dropdownRef = useClickOutside(() => setShowSuggestions(false));

    const fetchSuggestions = useCallback(
      debounce(async (value: string) => {
        if (value.trim().length < 2) {
          setSuggestions([]);
          setIsLoadingSuggestions(false);
          return;
        }

        setIsLoadingSuggestions(true);
        try {
          const res = await fetch(
            `/api/autocomplete?q=${encodeURIComponent(value)}&limit=8`,
          );
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Autocomplete fetch error:", error);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 250),
      [],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchInput(val);
      setSelectedIndex(-1);
      setShowSuggestions(true);
      fetchSuggestions(val);
    };

    const handleSuggestionClick = (suggestion: any) => {
      setSearchInput(suggestion.title);
      setShowSuggestions(false);
      router.push(`/search?query=${encodeURIComponent(suggestion.title)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    const handleSuggestionHover = (index: number) => {
      setSelectedIndex(index);
    };

    return (
      <div ref={dropdownRef} className="relative w-full">
        <form
          className="flex items-center h-9 bg-background rounded-full overflow-hidden border border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all w-full"
          onSubmit={onSearchSubmit}
        >
          <input
            ref={inputRef}
            title="search"
            type="text"
            name="searchInput"
            value={searchInput}
            placeholder="Search Dyfk"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchInput.trim().length >= 2) setShowSuggestions(true);
            }}
            className="flex-1 h-full bg-transparent py-1.5 focus:outline-none border-none px-3 leading-tight text-foreground placeholder:text-muted-foreground text-sm"
          />
          <button
            type="submit"
            title="Search"
            className="btn py-1 px-3 m-0.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search style={{ fontSize: 18 }} />
          </button>
        </form>

        {showSuggestions && searchInput.trim().length >= 2 && (
          <div
            ref={suggestionsRef}
            className="absolute top-10 left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-2xl max-h-72 overflow-y-auto py-2"
          >
            {isLoadingSuggestions ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No suggestions found
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion._id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => handleSuggestionHover(index)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    index === selectedIndex
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {suggestion.main_image && (
                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <ImageRenderer image={suggestion.main_image} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {suggestion.title}
                    </p>
                    {suggestion.list_price != null && (
                      <p className="text-xs text-muted-foreground">
                        ${suggestion.list_price}
                      </p>
                    )}
                  </div>
                  <Search
                    className="text-muted-foreground/50"
                    style={{ fontSize: 16 }}
                  />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  },
);
SearchBarWithAutocomplete.displayName = "SearchBarWithAutocomplete";

// ---------- UserProfile ----------
const UserProfile = React.memo(() => {
  const session = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.data?.user as any;

  return (
    <div className="flex items-center gap-1.5">
      {user ? (
        <Link
          href="/profile"
          className="text-foreground hover:text-primary transition-colors text-sm"
        >
          <span className="hidden sm:inline">{user?.name}</span>
        </Link>
      ) : (
        <SignIn />
      )}
      <span className="text-muted-foreground">
        <NavigateNext style={{ fontSize: 14 }} />
      </span>
      <div className="relative">
        {unreadCount > 0 && (
          <p className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
            {unreadCount}
          </p>
        )}
        <Link href="/profile" className="hover:scale-110 transition-transform">
          <Person style={{ fontSize: 24 }} className="text-foreground" />
        </Link>
      </div>
    </div>
  );
});
UserProfile.displayName = "UserProfile";

// ---------- CartIcon ----------
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
        <ShoppingCart style={{ fontSize: 24 }} className="text-foreground" />
      </Link>
    </div>
  );
});
CartIcon.displayName = "CartIcon";

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
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState<
    Array<{ _id: string; name: string; contentType: string }>
  >([]);
  const [sidebarMenus, setSidebarMenus] = useState<any[]>([]);

  // Scroll hiding state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // If scrolling down and past threshold, hide; else show
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sidebarRef = useClickOutside(() => setIsSidebarOpen(false));

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
            className="block px-3 py-1.5 text-sm font-medium text-foreground hover:text-primary hover:bg-muted rounded-lg transition-all duration-200"
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
        router.push(`/search?query=${encodeURIComponent(searchInput)}`);
      }
    },
    [searchInput, router],
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border shadow-sm transition-transform duration-300 ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="px-4 lg:px-8 py-1.5">
          {/* Grid layout: on mobile, first row = logo + actions, second row = search, third row = nav */}
          {/* On large screens, logo, search, actions in one row, nav below */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr,auto] gap-y-2 lg:gap-x-4 items-center">
            {/* Left section: Menu + Logo on all screens, Actions hidden on large */}
            <div className="flex items-center justify-between lg:justify-start">
              <div className="flex items-center gap-2">
                <button
                  title="Toggle sidebar"
                  type="button"
                  onClick={toggleSidebar}
                  className="hover:bg-muted p-1.5 rounded-full transition-colors"
                >
                  <Menu style={{ fontSize: 24 }} className="text-foreground" />
                </button>
                <Link href="/" className="flex-shrink-0">
                  <Image
                    src="/logo.png"
                    width={50}
                    height={25}
                    alt="logo"
                    priority
                    className="h-auto w-auto"
                  />
                </Link>
              </div>
              {/* Show actions on mobile only (they'll be hidden on large) */}
              <div className="flex items-center gap-2 lg:hidden">
                <UserProfile />
                <CartIcon />
              </div>
            </div>

            {/* Center: Search bar - always visible, full width on mobile, flex-1 on large */}
            <div className="w-full">
              <SearchBarWithAutocomplete
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                onSearchSubmit={handleSearchSubmit}
              />
            </div>

            {/* Right section: Actions on large screens only */}
            <div className="hidden lg:flex items-center gap-2 justify-end">
              <UserProfile />
              <CartIcon />
            </div>
          </div>

          {/* Navigation bar - always below */}
          <div className="border-border pt-0.5 overflow-x-auto scrollbar-none mt-1">
            <ul className="flex items-center gap-0.5 whitespace-nowrap">
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
