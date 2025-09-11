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
import { SignIn } from "./auth/SignInButton";
import { useSession } from "next-auth/react";

// Extracted Search Component
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
                 border-none px-3 leading-tight text-sec bg-background"
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
  }
);

SearchBar.displayName = "SearchBar";

// Extracted User Profile Component
const UserProfile = React.memo(() => {
  const session = useSession();
  const user = session?.data?.user as any;

  return (
    <div className="flex items-center">
      {user ? (
        <Link href={"/profile"}>
          <p className=" ">{user?.name}</p>
        </Link>
      ) : (
        <SignIn />
      )}
      <span>
        <NavigateNext style={{ fontSize: 16 }} />
      </span>
      <Link href={"/profile"}>
        <Person style={{ fontSize: 30 }} />
      </Link>
    </div>
  );
});

UserProfile.displayName = "UserProfile";

// Extracted Cart Icon Component
const CartIcon = React.memo(() => {
  const { cart } = useCart();

  return (
    <span className="relative">
      {cart.length > 0 && (
        <p className="absolute right-0 -top-2 bg-red-500 text-xs rounded-full px-1 min-w-[18px] text-center">
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

// Sidebar Component
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
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-surface shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 flex justify-between items-center border-b border-gray-200">
            <Link href={`/category`}>
              <h2 className="text-xl font-semibold">Categories</h2>
            </Link>

            <button
              title="category "
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <Close />
            </button>
          </div>

          <div className="overflow-y-auto h-full pb-20">
            <ul className="py-4">
              {categories.slice(0, 15).map((category, index) => (
                <li key={index} className="border-b border-gray-100">
                  <Link
                    href={`/category?id=${category._id}`}
                    className="block py-3 px-6 hover:bg-gray-100 transition-colors"
                    onClick={onClose}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Additional sidebar content */}
            <div className="px-6 py-4">
              <h3 className="font-medium mb-2">Customer Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/help"
                    className="text-sm text-gray-600 hover:text-primary"
                    onClick={onClose}
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-gray-600 hover:text-primary"
                    onClick={onClose}
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns"
                    className="text-sm text-gray-600 hover:text-primary"
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
  }
);

Sidebar.displayName = "Sidebar";

const Header = () => {
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function findCategories() {
      const res = await getCategory();
      setCategory(res);
    }
    findCategories();
  }, []);

  const domNode = useClickOutside(() => setShowSearchBox(false));
  const sidebarRef = useClickOutside(() => setIsSidebarOpen(false));

  // Memoize categories to prevent unnecessary re-renders
  const categoryList = useMemo(() => {
    return category.slice(0, 10).map((cat, index) => (
      <li key={index} className="inline-block pt-2 px-2">
        <Link href={`/category?id=${cat._id}`}>{cat.name}</Link>
      </li>
    ));
  }, [category]);

  // Handle search submission
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchInput.trim()) {
        window.location.href = `/search?query=${encodeURIComponent(
          searchInput
        )}`;
      }
    },
    [searchInput]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <>
      <div className="p-2 bg-surface text-pri sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button title="toggle " type="button" onClick={toggleSidebar}>
              <Menu style={{ fontSize: 30 }} />
            </button>
            <Link href={"/"}>
              <Image
                src={"/logo.png"}
                width={60}
                height={30}
                alt="logo"
                priority // Prioritize loading logo
              />
            </Link>
          </div>

          {/* Desktop Search */}
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
            {/* Mobile Search Toggle */}
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

        {/* Mobile Search */}
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

        {/* Categories */}
        <div className="mt-2">
          <ul className="whitespace-nowrap overflow-auto scrollbar-none">
            {categoryList}
          </ul>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        categories={category}
      />
    </>
  );
};

export default React.memo(Header);
