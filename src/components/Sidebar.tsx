// components/Sidebar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Close, ExpandLess, ExpandMore } from "@mui/icons-material";
import { resolveHref } from "@/lib/menu/resolve";
import type { NavItem, NavMenuConfig } from "./HeaderClient";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

interface SidebarMenu extends NavMenuConfig {
  _id?: string;
  name?: string;
  sectionTitle?: string;
  items?: NavItem[];
  displayConfig?: NavMenuConfig;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarMenus: any[];
}

/* -------------------------------------------------------------------------- */
/*                              Tree renderer                                 */
/* -------------------------------------------------------------------------- */

function SidebarTree({
  items,
  onClose,
  depth = 0,
}: {
  items: NavItem[];
  onClose: () => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visible = (items ?? []).filter((i) => i.isVisible !== false);
  if (!visible.length) return null;

  return (
    <ul className={depth ? "border-l border-border/60" : undefined}>
      {visible.map((item) => {
        const key = item._id ?? item.label;
        const hasChildren = !!item.children?.length;
        const isOpen = expanded.has(key);

        return (
          <li key={key}>
            <div
              className="flex items-center border-b border-border"
              style={{ paddingLeft: `${depth * 12}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(key);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ExpandLess fontSize="small" />
                  ) : (
                    <ExpandMore fontSize="small" />
                  )}
                </button>
              ) : (
                <span className="inline-block w-8" aria-hidden="true" />
              )}

              <Link
                href={resolveHref(item)}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                onClick={onClose}
                className="flex flex-1 items-center gap-2 py-3 pr-4 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                <span className="truncate">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </div>

            {hasChildren && isOpen ? (
              <SidebarTree
                items={item.children ?? []}
                onClose={onClose}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Menu section                                  */
/* -------------------------------------------------------------------------- */

function SidebarMenuSection({
  menu,
  onClose,
}: {
  menu: SidebarMenu;
  onClose: () => void;
}) {
  const items = menu.items ?? [];
  if (!items.length) return null;

  return (
    <div className="py-1">
      {menu.sectionTitle ? (
        <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {menu.sectionTitle}
        </h3>
      ) : null}
      <SidebarTree items={items} onClose={onClose} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Sidebar                                    */
/* -------------------------------------------------------------------------- */

const Sidebar = React.memo(
  ({ isOpen, onClose, sidebarMenus }: SidebarProps) => {
    const hasMenus = Array.isArray(sidebarMenus) && sidebarMenus.length > 0;

    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        {/* Sidebar panel */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-background shadow-lg transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-hidden={!isOpen}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <Link
              href="/"
              onClick={onClose}
              className="text-xl font-semibold text-foreground"
            >
              Menu
            </Link>
            <button
              title="Close sidebar"
              type="button"
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="Close sidebar"
            >
              <Close />
            </button>
          </div>

          <div className="h-[calc(100%-4rem)] overflow-y-auto pb-20">
            {hasMenus ? (
              sidebarMenus.map((menu, i) => (
                <SidebarMenuSection
                  key={menu._id ?? i}
                  menu={menu}
                  onClose={onClose}
                />
              ))
            ) : (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                No navigation available.
              </p>
            )}

            {/* Support links */}
            <div className="mt-4 border-t border-border px-6 py-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    Returns &amp; Refunds
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";

export default Sidebar;
