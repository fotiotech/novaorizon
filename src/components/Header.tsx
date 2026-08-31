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
  Close,
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

    const handleClear = () => {
      setSearchInput("");
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
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
          className="flex h-10 w-full items-center overflow-hidden rounded-full border border-border bg-background transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-ring"
          onSubmit={onSearchSubmit}
          role="search"
        >
          <input
            ref={inputRef}
            type="text"
            name="searchInput"
            value={searchInput}
            placeholder="Search Dyfk"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchInput.trim().length >= 2) setShowSuggestions(true);
            }}
            className="h-full flex-1 border-none bg-transparent px-4 py-2 text-base leading-tight text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search for products"
            autoComplete="off"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <Close style={{ fontSize: 18 }} />
            </button>
          )}
          <button
            type="submit"
            className="btn m-0.5 rounded-full bg-primary px-3.5 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Submit search"
          >
            <Search style={{ fontSize: 20 }} />
          </button>
        </form>

        {showSuggestions && searchInput.trim().length >= 2 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-10 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-background py-2 shadow-2xl"
            role="listbox"
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
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  {suggestion.main_image && (
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      <ImageRenderer image={suggestion.main_image} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
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
          className="rounded-md text-sm text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className="hidden sm:inline">{user?.name}</span>
        </Link>
      ) : (
        <SignIn />
      )}
      <span className="text-muted-foreground" aria-hidden="true">
        <NavigateNext style={{ fontSize: 16 }} />
      </span>
      <div className="relative">
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount}
          </span>
        )}
        <Link
          href="/profile"
          className="rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Profile"
        >
          <Person style={{ fontSize: 28 }} className="text-foreground" />
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
    <div className="relative transition-transform hover:scale-110">
      {itemCount > 0 && (
        <span
          className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
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
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Hide only after scrolling down more than 80px; show immediately when scrolling up
      if (scrollDelta > 80 && currentScrollY > 100) {
        setIsNavigationVisible(false);
      } else if (scrollDelta < 0) {
        setIsNavigationVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            className="block rounded-lg px-4 py-2 text-base font-medium text-foreground transition-all duration-200 hover:bg-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
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
        className="sticky top-0 z-30 border-b border-border bg-background/80 shadow-sm backdrop-blur-md"
        role="banner"
      >
        <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-y-2">
            <div className="flex flex-wrap items-center lg:flex-nowrap lg:gap-x-5">
              <div className="flex w-full items-center justify-between lg:w-auto lg:flex-none">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="rounded-full p-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Toggle navigation menu"
                  >
                    <Menu
                      style={{ fontSize: 28 }}
                      className="text-foreground"
                    />
                  </button>
                  <Link
                    href="/"
                    className="flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Homepage"
                  >
                    <Image
                      src="/logo.png"
                      width={100}
                      height={100}
                      alt="logo"
                      priority
                      className="h-auto w-auto"
                    />
                  </Link>
                </div>

                <div className="flex items-center gap-3 lg:hidden">
                  <UserProfile />
                  <CartIcon />
                </div>
              </div>

              {/* Full width on mobile; fills all available desktop space. */}
              <div className="order-2 w-full min-w-0 lg:order-none lg:flex-1 lg:mx-20">
                <SearchBarWithAutocomplete
                  searchInput={searchInput}
                  setSearchInput={setSearchInput}
                  onSearchSubmit={handleSearchSubmit}
                />
              </div>

              <div className="hidden flex-none items-center gap-3 lg:flex">
                <UserProfile />
                <CartIcon />
              </div>
            </div>

            <div
              className={`w-full overflow-hidden transition-all duration-300 ${
                isNavigationVisible
                  ? "max-h-14 translate-y-0 opacity-100"
                  : "max-h-0 -translate-y-1 opacity-0"
              }`}
            >
              <div className="overflow-x-auto scrollbar-none">
                <nav aria-label="Main navigation">
                  <ul className="flex items-center gap-0.5 whitespace-nowrap">
                    {navigationItems}
                  </ul>
                </nav>
              </div>
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
    </>
  );
};

export default React.memo(Header);
