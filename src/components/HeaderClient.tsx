// components/HeaderClient.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Menu, Person, Search, ShoppingCart } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { SignIn } from "../app/(auth)/components/auth/SignInButton";
import { useSession } from "next-auth/react";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";
import Sidebar from "./Sidebar";
import SearchModal from "./ui/SearchModal";
import DesktopSearchBar from "./ui/DesktopSearchBar";
import ProfilePopover from "@/app/(profile)/components/ux/ProfilePopover";
import CartPopover from "./cart/CartPopover";
import { resolveHref } from "@/lib/menu/resolve";

// ---------- Logo sources ----------
const LOGO_DARK = "/logoc1.png";

/* -------------------------------------------------------------------------- */
/*                             Nav tree types                                 */
/* -------------------------------------------------------------------------- */

export type NavLinkType =
  | "category"
  | "product"
  | "collection"
  | "page"
  | "custom";
export type NavSubmenuDisplay =
  | "dropdown"
  | "flyout"
  | "mega"
  | "grid"
  | "accordion";
export type NavAlignment = "start" | "center" | "end" | "stretch";
export type NavTheme = "light" | "dark" | "inherit";

export interface NavItem {
  _id?: string;
  label: string;
  type: NavLinkType;
  refId?: string | null;
  url?: string;
  slug?: string | null;
  icon?: string | null;
  badge?: string | null;
  openInNewTab?: boolean;
  isVisible?: boolean;
  submenuDisplay?: NavSubmenuDisplay | null;
  columns?: number;
  submenuPosition?: string;
  align?: NavAlignment;
  featured?: {
    image?: string | null;
    title?: string | null;
    href?: string | null;
    ctaText?: string | null;
    badge?: string | null;
  } | null;
  children?: NavItem[];
}

export interface NavMenuConfig {
  alignment?: NavAlignment;
  gap?: number;
  animation?: "none" | "fade" | "slide" | "scale";
  showCaret?: boolean;
  megaWidth?: string;
  theme?: NavTheme;
  borderless?: boolean;
  rounded?: boolean;
  shadow?: boolean;
}

export interface NavMenu {
  items: NavItem[];
  display?: "horizontal" | "vertical" | "mega";
  displayConfig?: NavMenuConfig;
}

interface HeaderClientProps {
  navMenu: NavMenu | null;
  sidebarMenus: any[];
}

/* -------------------------------------------------------------------------- */
/*                             Nav style tokens                               */
/* -------------------------------------------------------------------------- */

const FALLBACK_SUBMENU: NavSubmenuDisplay = "dropdown";

const ANIM_CLS: Record<string, string> = {
  none: "",
  fade: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150",
  slide:
    "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition-all duration-150",
  scale:
    "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100 transition-all duration-150",
};

const ALIGN_CLS: Record<string, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
  stretch: "left-0 right-0",
};

const BAR_JUSTIFY_CLS: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  stretch: "justify-between",
};

const THEME_CLS: Record<string, string> = {
  light: "bg-white text-neutral-900 border-neutral-200",
  dark: "bg-neutral-900 text-neutral-100 border-neutral-700",
  inherit: "border-current/20",
};

/* -------------------------------------------------------------------------- */
/*                                  Logo                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                  NavTree                                   */
/* -------------------------------------------------------------------------- */

function NavTree({
  items,
  config,
  menuDisplay = "horizontal",
  depth = 0,
}: {
  items: NavItem[];
  config: NavMenuConfig;
  menuDisplay: "horizontal" | "vertical" | "mega";
  depth?: number;
}) {
  const visible = (items ?? []).filter((i) => i.isVisible !== false);
  if (!visible.length) return null;

  const isRoot = depth === 0;
  const alignment = config.alignment ?? "start";
  const gap = config.gap ?? 16;

  return (
    <ul
      className={
        isRoot
          ? `flex items-center ${BAR_JUSTIFY_CLS[alignment] ?? "justify-start"}`
          : "flex flex-col gap-1"
      }
      style={isRoot ? { gap: `${gap}px` } : undefined}
    >
      {visible.map((item) => {
        const hasChildren = !!item.children?.length;

        // A top-level item defaults to "mega" when the menu itself is
        // configured as mega. Individual items can still override.
        const defaultSubmenu: NavSubmenuDisplay =
          isRoot && menuDisplay === "mega" ? "mega" : FALLBACK_SUBMENU;
        const submenu = item.submenuDisplay ?? defaultSubmenu;

        // Top-level mega/grid panels anchor to the nav wrapper (which is
        // position:relative) instead of the individual <li>, so a wide
        // panel spans the bar and stays inside the viewport.
        const isTopLevelMega =
          isRoot && (submenu === "mega" || submenu === "grid");

        return (
          <li
            key={item._id ?? item.label}
            className={`group ${isTopLevelMega ? "" : "relative"}`}
          >
            <Link
              href={resolveHref(item)}
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {item.icon ? <span aria-hidden>{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                  {item.badge}
                </span>
              ) : null}
              {hasChildren &&
              config.showCaret !== false &&
              submenu !== "mega" ? (
                <svg
                  viewBox="0 0 20 20"
                  className="size-3 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M5 7l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : null}
            </Link>

            {hasChildren ? (
              <NavSubmenu
                item={item}
                submenu={submenu}
                config={config}
                menuDisplay={menuDisplay}
                depth={depth}
                isTopLevelMega={isTopLevelMega}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                NavSubmenu                                  */
/* -------------------------------------------------------------------------- */

function NavSubmenu({
  item,
  submenu,
  config,
  menuDisplay,
  depth,
  isTopLevelMega,
}: {
  item: NavItem;
  submenu: NavSubmenuDisplay;
  config: NavMenuConfig;
  menuDisplay: "horizontal" | "vertical" | "mega";
  depth: number;
  isTopLevelMega: boolean;
}) {
  const theme = config.theme ?? "light";
  const animation = config.animation ?? "fade";

  const panelCls = [
    "absolute z-50 p-2",
    THEME_CLS[theme] ?? THEME_CLS.light,
    config.borderless ? "border-0" : "border",
    config.rounded === false ? "rounded-none" : "rounded-lg",
    config.shadow === false ? "" : "shadow-lg",
  ].join(" ");

  const anim = ANIM_CLS[animation] ?? ANIM_CLS.fade;

  /* ---- accordion: inline expansion ---- */
  if (submenu === "accordion") {
    return (
      <div className="mt-1 hidden group-hover:block group-focus-within:block">
        <NavTree
          items={item.children ?? []}
          config={config}
          menuDisplay={menuDisplay}
          depth={depth + 1}
        />
      </div>
    );
  }

  /* ---- flyout: side-anchored ---- */
  if (submenu === "flyout") {
    const openRight = item.submenuPosition?.startsWith("bottom");
    return (
      <div
        className={`${panelCls} invisible top-0 min-w-48 ${anim} group-hover:visible group-focus-within:visible`}
        style={openRight ? { left: "100%" } : { right: "100%" }}
      >
        <NavTree
          items={item.children ?? []}
          config={config}
          menuDisplay={menuDisplay}
          depth={depth + 1}
        />
      </div>
    );
  }

  /* ---- mega / grid: multi-column panel ---- */
  if (submenu === "mega" || submenu === "grid") {
    const cols = item.columns ?? 3;

    // `container` means "match the nav wrapper's width". Anything else is
    // treated as a CSS length and clamped to the viewport.
    const rawWidth = config.megaWidth ?? "960px";
    const isContainer = rawWidth === "container";
    const width = isContainer ? "100%" : rawWidth;
    const maxWidth = isContainer ? "100%" : `min(96vw, ${rawWidth})`;

    // Top-level panels anchor to the nav wrapper and center themselves.
    // Nested panels fall back to the item-relative anchor.
    const positionCls = isTopLevelMega
      ? "left-0 right-0 mx-auto"
      : item.submenuPosition?.endsWith("end")
        ? "right-0"
        : "left-0";

    return (
      <div
        className={`${panelCls} invisible top-full mt-2 ${anim} group-hover:visible group-focus-within:visible ${positionCls}`}
        style={{ width, maxWidth }}
      >
        <div className="flex gap-6">
          <div
            className="grid flex-1 gap-x-6 gap-y-4"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {(item.children ?? []).map((child) => (
              <div key={child._id ?? child.label} className="min-w-0">
                <Link
                  href={resolveHref(child)}
                  className="block text-sm font-semibold hover:text-indigo-600"
                >
                  {child.label}
                </Link>
                {child.children?.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {child.children
                      .filter((g) => g.isVisible !== false)
                      .map((grand) => (
                        <li key={grand._id ?? grand.label}>
                          <Link
                            href={resolveHref(grand)}
                            className="text-sm opacity-70 hover:opacity-100 hover:text-indigo-600"
                          >
                            {grand.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          {item.featured?.image ? (
            <Link
              href={item.featured.href || "#"}
              className="hidden w-56 shrink-0 overflow-hidden rounded-lg border border-current/10 lg:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.featured.image}
                alt={item.featured.title ?? ""}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
              <div className="p-3">
                {item.featured.badge ? (
                  <span className="mb-1 inline-block rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {item.featured.badge}
                  </span>
                ) : null}
                {item.featured.title ? (
                  <p className="text-sm font-semibold">{item.featured.title}</p>
                ) : null}
                {item.featured.ctaText ? (
                  <p className="mt-1 text-xs text-indigo-600">
                    {item.featured.ctaText} →
                  </p>
                ) : null}
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  /* ---- default: dropdown ---- */
  const align =
    ALIGN_CLS[item.align ?? config.alignment ?? "start"] ?? "left-0";
  return (
    <div
      className={`${panelCls} invisible top-full mt-2 min-w-48 ${anim} group-hover:visible group-focus-within:visible ${align}`}
    >
      <NavTree
        items={item.children ?? []}
        config={config}
        menuDisplay={menuDisplay}
        depth={depth + 1}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               HeaderClient                                 */
/* -------------------------------------------------------------------------- */

const HeaderClient = ({ navMenu, sidebarMenus }: HeaderClientProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const displayConfig = useMemo<NavMenuConfig>(
    () => navMenu?.displayConfig ?? {},
    [navMenu?.displayConfig],
  );

  const hasNav = !!navMenu && navMenu.items.length > 0;

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

          {hasNav ? (
            <div className="relative w-full overflow-x-auto md:overflow-visible">
              <nav
                aria-label="Main navigation"
                className="w-max min-w-full md:w-full"
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
