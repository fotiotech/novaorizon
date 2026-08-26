"use client";

import React from "react";
import Link from "next/link";
import { Close } from "@mui/icons-material";
import { Category } from "@/constant/types";

// Helper to get item name (handles Product with `title`)
const getItemName = (item: any) => item.title || item.name || "Unnamed";

// Helper to build dynamic route from item
const getItemHref = (item: any) => {
  const name = getItemName(item);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const contentType = item.contentType || "Product";
  const prefix = contentType.toLowerCase() + "s"; // e.g., products, collections
  return `/${prefix}/${slug}/${item._id}`;
};

// ---------- Recursive Sidebar Menu Node ----------
const SidebarMenuNode = ({
  menu,
  onClose,
}: {
  menu: any;
  onClose: () => void;
}) => {
  const { name, display, link, items = [], sectionTitle } = menu;

  // For "List", "Grid", "Carousel", "Dropdown" – render a list of items
  if (["List", "Grid", "Carousel", "Dropdown"].includes(display)) {
    const hasItems = items.length > 0;

    return (
      <div className="py-1">
        {sectionTitle && (
          <h3 className="font-semibold text-foreground px-4 py-2">
            {sectionTitle}
          </h3>
        )}
        {hasItems ? (
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
        ) : (
          // Fallback if no items but link exists
          link && (
            <Link
              href={link}
              className="block py-2 px-6 hover:bg-muted transition-colors text-foreground"
              onClick={onClose}
            >
              {name}
            </Link>
          )
        )}
      </div>
    );
  }

  // For "MegaMenu" – we render a grid/list of items
  if (display === "MegaMenu") {
    const hasItems = items.length > 0;
    return (
      <div className="py-1">
        {sectionTitle && (
          <h3 className="font-semibold text-foreground px-4 py-2">
            {sectionTitle}
          </h3>
        )}
        {hasItems ? (
          <ul className="grid grid-cols-1 gap-1">
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
        ) : (
          link && (
            <Link
              href={link}
              className="block py-2 px-6 hover:bg-muted transition-colors text-foreground"
              onClick={onClose}
            >
              {name}
            </Link>
          )
        )}
      </div>
    );
  }

  // Fallback: show as a simple link
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

// ---------- Sidebar Component ----------
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  sidebarMenus: any[];
}

const Sidebar = React.memo(
  ({ isOpen, onClose, categories, sidebarMenus }: SidebarProps) => {
    const hasMenus = sidebarMenus && sidebarMenus.length > 0;

    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}

        {/* Sidebar panel */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 flex justify-between items-center border-b border-border">
            <Link href={hasMenus ? "#" : "/category"}>
              <h2 className="text-xl font-semibold text-foreground">
                {hasMenus ? "Menu" : "Categories"}
              </h2>
            </Link>
            <button
              title="close sidebar"
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted"
            >
              <Close />
            </button>
          </div>

          <div className="overflow-y-auto h-full pb-20">
            {hasMenus ? (
              // Render sidebar menus
              sidebarMenus.map((menu) => (
                <SidebarMenuNode key={menu._id} menu={menu} onClose={onClose} />
              ))
            ) : (
              // Fallback: categories list
              <ul className="py-4">
                {categories.slice(0, 15).map((category) => (
                  <li key={category._id} className="border-b border-border">
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
            )}

            {/* Additional sidebar content (support links) */}
            <div className="px-6 py-4 border-t border-border mt-4">
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

export default Sidebar;
