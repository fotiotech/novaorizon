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

const Header = () => {
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<Category[]>([]);

  useEffect(() => {
    async function findCategories() {
      const res = await getCategory();
      setCategory(res);
    }
    findCategories();
  }, []);

  const domNode = useClickOutside(() => setShowSearchBox(false));

  // Memoize categories to prevent unnecessary re-renders
  const categoryList = useMemo(() => {
    return category.map((cat, index) => (
      <li key={index} className="inline-block pt-2 px-2">
        {cat.name}
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

  return (
    <div className="p-2 bg-surface text-pri">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Menu style={{ fontSize: 30 }} />
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
  );
};

export default React.memo(Header);
