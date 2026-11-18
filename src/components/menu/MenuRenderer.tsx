// components/menu/MenuRenderer.tsx
import React from "react";
import { apiData } from "@/lib/server-api";
import { NavTree, type NavMenuConfig } from "./NavTree";
import type { MenuDisplayType } from "@/lib/menu/constants";

interface MenuRendererProps {
  /** Which surface to render. Must be a value from MENU_LOCATIONS. */
  location: string;
  className?: string;
  /** Wrapper element. Defaults to `<section>`. */
  as?: "div" | "section" | "nav" | "aside";
}

/**
 * Server component that fetches every active menu for a location and renders
 * each one as an interactive tree. Layout, theme, and per-item overrides all
 * come from the menu document — nothing is hardcoded here.
 */
export default async function MenuRenderer({
  location,
  className = "",
  as = "section",
}: MenuRendererProps) {
  const menus = await apiData<any[]>(`/menus/location/${encodeURIComponent(location)}`, {
    cache: "force-cache",
  });
  if (!Array.isArray(menus) || menus.length === 0) return null;

  // Skip menus where every item is hidden — nothing to draw.
  const usable = menus.filter((menu: any) =>
    (menu.items ?? []).some((i: any) => i.isVisible !== false),
  );
  if (!usable.length) return null;

  const Wrapper = as;

  return (
    <Wrapper className={className}>
      {usable.map((menu: any, i: number) => (
        <div key={menu._id ?? i} className={i > 0 ? "mt-8" : ""}>
          <NavTree
            items={menu.items ?? []}
            config={(menu.displayConfig ?? {}) as NavMenuConfig}
            menuDisplay={(menu.display ?? "horizontal") as MenuDisplayType}
          />
        </div>
      ))}
    </Wrapper>
  );
}