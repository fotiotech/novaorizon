"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Close, ExpandLess, ExpandMore } from "@mui/icons-material";
import { Category } from "@/constant/types";

// ---------- Helpers ----------
function getItemName(item: any): string {
  return item?.title || item?.name || "Unnamed";
}

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Dynamic route from a menu item (products, collections, …). */
function getItemHref(item: any): string {
  const name = getItemName(item);
  const slug = slugify(name);
  const contentType = item?.contentType || "Product";
  const prefix = String(contentType).toLowerCase() + "s"; // products, collections…
  return `/${prefix}/${slug}/${item._id}`;
}

/** Category link in the new slug/id route shape. */
function categoryHref(cat: any): string {
  const id = String(cat?._id ?? "");
  const slug = cat?.slug || cat?.url_slug || slugify(cat?.name || "");
  return `/category/${slug}/${id}`;
}

function categoryImage(cat: any): string | null {
  const raw = cat?.imageUrl ?? cat?.image ?? null;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === "string") return raw;
  return null;
}

// ---------- Menu node (SidebarMenu) ----------
const SidebarMenuNode = ({
  menu,
  onClose,
}: {
  menu: any;
  onClose: () => void;
}) => {
  const { name, display, link, items = [], sectionTitle } = menu;

  const renderItems = () => (
    <ul>
      {items.map((item: any) => (
        <li key={item._id}>
          <Link
            href={getItemHref(item)}
            className="block py-2 px-6 hover:bg-muted transition-colors text-foreground"
            onClick={onClose}
          >
            {getItemName(item)}
          </Link>
        </li>
      ))}
    </ul>
  );

  const renderFallback = () =>
    link ? (
      <Link
        href={link}
        className="block py-2 px-6 hover:bg-muted transition-colors text-foreground"
        onClick={onClose}
      >
        {name}
      </Link>
    ) : null;

  if (["List", "Grid", "Carousel", "Dropdown", "MegaMenu"].includes(display)) {
    const hasItems = Array.isArray(items) && items.length > 0;
    return (
      <div className="py-1">
        {sectionTitle && (
          <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {sectionTitle}
          </h3>
        )}
        {hasItems ? renderItems() : renderFallback()}
      </div>
    );
  }

  return (
    <div className="py-1">
      <Link
        href={link || "#"}
        className="block py-2 px-6 hover:bg-muted transition-colors text-foreground"
        onClick={onClose}
      >
        {name}
      </Link>
    </div>
  );
};

// ---------- Category tree ----------
type CatNode = {
  _id: string;
  name: string;
  slug?: string;
  url_slug?: string;
  parentId?: string | null;
  parent_id?: string | null;
  imageUrl?: string[] | string | null;
  image?: string | null;
  sortOrder?: number;
};

function parentOf(cat: CatNode): string | null {
  const raw = cat.parentId ?? cat.parent_id ?? null;
  if (!raw) return null;
  return String(raw);
}

const CategoryTree = ({
  categories,
  onClose,
}: {
  categories: CatNode[];
  onClose: () => void;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { childrenByParent, topLevel } = useMemo(() => {
    const byId = new Map<string, CatNode>();
    const childrenByParent = new Map<string, CatNode[]>();
    const topLevel: CatNode[] = [];

    for (const c of categories) {
      if (c?._id) byId.set(String(c._id), c);
    }
    for (const c of categories) {
      const pid = parentOf(c);
      if (!pid || !byId.has(pid)) {
        topLevel.push(c);
      } else {
        const arr = childrenByParent.get(pid) ?? [];
        arr.push(c);
        childrenByParent.set(pid, arr);
      }
    }

    const byOrder = (a: CatNode, b: CatNode) => {
      const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    };
    topLevel.sort(byOrder);
    for (const arr of childrenByParent.values()) arr.sort(byOrder);

    return { childrenByParent, topLevel };
  }, [categories]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderRow = (cat: CatNode, depth = 0): React.ReactNode => {
    const id = String(cat._id);
    const kids = childrenByParent.get(id) ?? [];
    const hasChildren = kids.length > 0;
    const isExpanded = expanded.has(id);
    const thumb = categoryImage(cat);

    return (
      <li key={id}>
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
                toggle(id);
              }}
              className="p-2 text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ExpandLess fontSize="small" />
              ) : (
                <ExpandMore fontSize="small" />
              )}
            </button>
          ) : (
            <span className="inline-block w-8" aria-hidden="true" />
          )}

          {thumb && (
            <span className="relative mr-2 h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-muted">
              <Image
                src={thumb}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            </span>
          )}

          <Link
            href={categoryHref(cat)}
            className="flex-1 py-3 pr-4 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
            onClick={onClose}
          >
            {cat.name}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <ul>{kids.map((k) => renderRow(k, depth + 1))}</ul>
        )}
      </li>
    );
  };

  if (topLevel.length === 0) {
    return (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        No categories yet.
      </p>
    );
  }

  return <ul>{topLevel.map((c) => renderRow(c, 0))}</ul>;
};

// ---------- Sidebar Component ----------
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  sidebarMenus: any[];
}

const Sidebar = React.memo(
  ({ isOpen, onClose, categories, sidebarMenus }: SidebarProps) => {
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
              href={hasMenus ? "/" : "/category"}
              onClick={onClose}
              className="text-xl font-semibold text-foreground"
            >
              {hasMenus ? "Menu" : "Categories"}
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
              sidebarMenus.map((menu) => (
                <SidebarMenuNode key={menu._id} menu={menu} onClose={onClose} />
              ))
            ) : (
              <CategoryTree
                categories={categories as unknown as CatNode[]}
                onClose={onClose}
              />
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
