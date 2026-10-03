// components/menu/NavTree.tsx
"use client";

import React from "react";
import Link from "next/link";
import { resolveHref } from "@/lib/menu/resolve";
import type {
  MenuDisplayType,
  SubmenuDisplayType,
  Alignment,
} from "@/lib/menu/constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type NavTheme = "light" | "dark" | "inherit";

export interface NavItem {
  _id?: string;
  label: string;
  type: "category" | "product" | "collection" | "page" | "custom";
  refId?: string | null;
  /** Slug of the referenced doc, populated server-side by getMenusByLocation. */
  slug?: string | null;
  url?: string;
  icon?: string | null;
  badge?: string | null;
  openInNewTab?: boolean;
  isVisible?: boolean;
  submenuDisplay?: SubmenuDisplayType | null;
  columns?: number;
  submenuPosition?: string;
  align?: Alignment;
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
  alignment?: Alignment;
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
  display?: MenuDisplayType;
  displayConfig?: NavMenuConfig;
}

/* -------------------------------------------------------------------------- */
/*                             Style tokens                                   */
/* -------------------------------------------------------------------------- */

const FALLBACK_SUBMENU: SubmenuDisplayType = "dropdown";

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
/*                                   NavTree                                  */
/* -------------------------------------------------------------------------- */

export function NavTree({
  items,
  config,
  menuDisplay = "horizontal",
  depth = 0,
}: {
  items: NavItem[];
  config: NavMenuConfig;
  menuDisplay?: MenuDisplayType;
  depth?: number;
}) {
  const visible = (items ?? []).filter((i) => i.isVisible !== false);
  if (!visible.length) return null;

  const isRoot = depth === 0;
  const isGridRoot = menuDisplay === "grid" && isRoot;
  const alignment = config.alignment ?? "start";
  const gap = config.gap ?? 16;

  const rootCls = isGridRoot
    ? "scrollbar-hide grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    : menuDisplay === "vertical"
      ? "scrollbar-hide flex flex-col items-stretch"
      : `scrollbar-hide flex flex-wrap items-center ${BAR_JUSTIFY_CLS[alignment] ?? "justify-start"}`;

  return (
    <ul
      className={isRoot ? rootCls : "scrollbar-hide flex flex-col gap-1"}
      style={isRoot && !isGridRoot ? { gap: `${gap}px` } : undefined}
    >
      {visible.map((item) => {
        const hasChildren = !!item.children?.length;
        const submenu = item.submenuDisplay ?? FALLBACK_SUBMENU;

        const linkCls = isGridRoot
          ? "flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-center transition hover:border-primary hover:shadow-md"
          : "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring";

        return (
          <li key={item._id ?? item.label} className="relative group">
            <Link
              href={resolveHref(item)}
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
              className={linkCls}
            >
              {item.icon ? (
                <span
                  aria-hidden
                  className={isGridRoot ? "text-2xl" : undefined}
                >
                  {item.icon}
                </span>
              ) : null}
              <span
                className={
                  isGridRoot
                    ? "text-sm font-semibold text-foreground"
                    : undefined
                }
              >
                {item.label}
              </span>
              {item.badge ? (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                  {item.badge}
                </span>
              ) : null}
              {hasChildren &&
              config.showCaret !== false &&
              submenu !== "mega" &&
              !isGridRoot ? (
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
}: {
  item: NavItem;
  submenu: SubmenuDisplayType;
  config: NavMenuConfig;
  menuDisplay: MenuDisplayType;
  depth: number;
}) {
  const theme = config.theme ?? "light";
  const animation = config.animation ?? "fade";

  const panelCls = [
    "scrollbar-hide absolute z-50 p-2",
    THEME_CLS[theme] ?? THEME_CLS.light,
    config.borderless ? "border-0" : "border",
    config.rounded === false ? "rounded-none" : "rounded-lg",
    config.shadow === false ? "" : "shadow-lg",
  ].join(" ");

  const anim = ANIM_CLS[animation] ?? ANIM_CLS.fade;

  if (submenu === "accordion") {
    return (
      <div className="scrollbar-hide mt-1 hidden group-hover:block group-focus-within:block">
        <NavTree
          items={item.children ?? []}
          config={config}
          menuDisplay={menuDisplay}
          depth={depth + 1}
        />
      </div>
    );
  }

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

  if (submenu === "mega" || submenu === "grid") {
    const cols = item.columns ?? 3;
    const posClass = item.submenuPosition?.endsWith("end")
      ? "right-0"
      : "left-0";
    const width = config.megaWidth ?? "960px";

    return (
      <div
        className={`${panelCls} invisible top-full mt-2 ${anim} group-hover:visible group-focus-within:visible ${posClass}`}
        style={{ width, maxWidth: `min(96vw, ${width})` }}
      >
        <div className="flex gap-6">
          <div
            className="scrollbar-hide grid flex-1 gap-x-6 gap-y-4"
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
                  <ul className="scrollbar-hide mt-2 space-y-1.5">
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
