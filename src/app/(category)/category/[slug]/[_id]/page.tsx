"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
  UnfoldMore,
  UnfoldLess,
  Menu as MenuIcon,
} from "@mui/icons-material";
import Spinner from "@/components/Spinner";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { findProductByCategory } from "@/app/actions/products";
import { getCategoriesForTree } from "@/app/actions/category";

// ---------- Types ----------
type CategoryNode = {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string[];
  description?: string;
  sortOrder?: number;
};

type SortKey = "featured" | "price-low" | "price-high" | "name";

// ---------- Helpers ----------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function catHref(cat: CategoryNode): string {
  const slug = cat.slug || slugify(cat.name || "");
  return `/category/${slug}/${cat._id}`;
}

function catImage(cat: CategoryNode): string | null {
  return cat.imageUrl?.[0] ?? null;
}

// ---------- Page ----------
export default function CategoryPage() {
  const params = useParams<{ slug?: string; _id?: string }>();
  const categoryId = params?._id ? String(params._id) : "";
  const isMobile = useIsMobile();

  const [allCategories, setAllCategories] = useState<CategoryNode[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Sidebar expansion. Starts empty — only top-level rows show until the
  // user clicks. The ancestor-chain effect below opens just enough for the
  // currently selected category to be visible.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Mobile bottom-sheet visibility.
  const [isCategoriesSheetOpen, setIsCategoriesSheetOpen] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceCap, setPriceCap] = useState(0);

  // ---------- Fetch all categories once ----------
  useEffect(() => {
    let cancelled = false;
    setLoadingCats(true);
    getCategoriesForTree()
      .then((list) => {
        if (cancelled) return;
        setAllCategories(Array.isArray(list) ? list : []);
        setCatError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load categories:", err);
        setCatError("Failed to load categories");
      })
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Build lookup structures ----------
  const { byId, childrenByParent, topLevel } = useMemo(() => {
    const byId = new Map<string, CategoryNode>();
    const childrenByParent = new Map<string, CategoryNode[]>();
    const topLevel: CategoryNode[] = [];

    for (const c of allCategories) byId.set(c._id, c);

    for (const c of allCategories) {
      const pid = c.parentId;
      if (!pid || !byId.has(pid)) {
        topLevel.push(c);
      } else {
        const arr = childrenByParent.get(pid) ?? [];
        arr.push(c);
        childrenByParent.set(pid, arr);
      }
    }

    // Respect admin-defined sortOrder, then fall back to alphabetical.
    const byOrder = (a: CategoryNode, b: CategoryNode) => {
      const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    };
    topLevel.sort(byOrder);
    for (const arr of childrenByParent.values()) arr.sort(byOrder);

    return { byId, childrenByParent, topLevel };
  }, [allCategories]);

  // ---------- Selected category from URL ----------
  const selectedCategory = useMemo(
    () => (categoryId ? (byId.get(categoryId) ?? null) : null),
    [byId, categoryId],
  );

  // Every descendant ID (so a parent category also shows child products).
  const selectedScopeIds = useMemo(() => {
    if (!selectedCategory) return [] as string[];
    const ids: string[] = [selectedCategory._id];
    const stack = [selectedCategory._id];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const kids = childrenByParent.get(cur) ?? [];
      for (const k of kids) {
        ids.push(k._id);
        stack.push(k._id);
      }
    }
    return ids;
  }, [selectedCategory, childrenByParent]);

  // True when the current selection includes descendant categories, i.e.
  // products from sub-categories will appear alongside this category's own.
  const includesDescendants = selectedScopeIds.length > 1;

  // Auto-expand only the ancestor chain of the currently selected node,
  // so the current selection is visible in context. Nothing else opens.
  useEffect(() => {
    if (!selectedCategory) return;
    const ancestors: string[] = [];
    let curr: CategoryNode | undefined = selectedCategory;
    const guard = new Set<string>();
    while (curr && !guard.has(curr._id)) {
      guard.add(curr._id);
      const pid = curr.parentId;
      if (!pid) break;
      ancestors.push(pid);
      curr = byId.get(pid);
    }
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const a of ancestors) {
        if (!next.has(a)) {
          next.add(a);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedCategory, byId]);

  // ---------- Fetch products whenever selection changes ----------
  useEffect(() => {
    if (!selectedCategory || selectedScopeIds.length === 0) {
      setProducts([]);
      setProductsError(null);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setProductsError(null);

    // selectedScopeIds already contains the current category plus every
    // descendant — so this single call returns the whole subtree's products.
    findProductByCategory(selectedScopeIds)
      .then((data) => {
        if (cancelled) return;

        if (data && !Array.isArray(data) && typeof data.error === "string") {
          setProducts([]);
          setProductsError(data.error);
          return;
        }

        const list: any[] = Array.isArray(data) ? data : [];
        setProducts(list);
        setProductsError(null);

        const top = list.reduce((m: number, p: any) => {
          const v = pickPrice(p.price, p.listPrice);
          return v > m ? v : m;
        }, 0);
        const rounded = Math.max(1000, Math.ceil(top / 100) * 100);
        setPriceCap(rounded);
        setMaxPrice(rounded);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load products:", err);
        setProducts([]);
        setProductsError(err?.message || "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedScopeIds]);

  // ---------- Filter + sort ----------
  const visible = useMemo(() => {
    let result = [...products];

    if (priceCap > 0) {
      result = result.filter((p) => {
        const v = pickPrice(p.price, p.listPrice);
        if (v === 0) return true; // "Price on request" items stay visible.
        return v <= maxPrice;
      });
    }

    if (inStockOnly) {
      result = result.filter((p) => (p.quantity ?? 0) > 0);
    }

    switch (sortBy) {
      case "price-low":
        result.sort(
          (a, b) =>
            pickPrice(a.price, a.listPrice) - pickPrice(b.price, b.listPrice),
        );
        break;
      case "price-high":
        result.sort(
          (a, b) =>
            pickPrice(b.price, b.listPrice) - pickPrice(a.price, a.listPrice),
        );
        break;
      case "name":
        result.sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? "")),
        );
        break;
      default:
        break;
    }
    return result;
  }, [products, sortBy, priceCap, maxPrice, inStockOnly]);

  const hasFilters = inStockOnly || (priceCap > 0 && maxPrice < priceCap);

  const clearFilters = () => {
    setInStockOnly(false);
    setMaxPrice(priceCap);
  };

  // ---------- Sidebar interactions ----------
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    for (const c of allCategories) {
      if (childrenByParent.get(c._id)?.length) all.add(c._id);
    }
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  // Called when a sidebar link is clicked. Keeps parents expanded so the
  // tree stays in the same state after navigation, and closes the mobile
  // sheet so the user lands on the products view.
  const handleSidebarLinkClick = (cat: CategoryNode) => {
    if (childrenByParent.get(cat._id)?.length) {
      setExpanded((prev) => {
        if (prev.has(cat._id)) return prev;
        const next = new Set(prev);
        next.add(cat._id);
        return next;
      });
    }
    if (isMobile) setIsCategoriesSheetOpen(false);
  };

  // Recursive sidebar row
  const renderCategoryRow = (cat: CategoryNode, depth = 0): React.ReactNode => {
    const kids = childrenByParent.get(cat._id) ?? [];
    const hasChildren = kids.length > 0;
    const isExpanded = expanded.has(cat._id);
    const isSelected = cat._id === categoryId;
    const thumb = catImage(cat);

    return (
      <li key={cat._id}>
        <div
          className={`flex items-center rounded-md transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted/60"
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(cat._id);
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
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
            <span className="inline-block w-6" aria-hidden="true" />
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

          {/* The category name is a real <Link> so navigation, prefetch,
              middle-click, and cmd-click all work natively. */}
          <Link
            href={catHref(cat)}
            onClick={() => handleSidebarLinkClick(cat)}
            className="flex-1 cursor-pointer py-1.5 pr-2 text-left text-sm hover:underline"
            aria-current={isSelected ? "page" : undefined}
          >
            {cat.name}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <ul className="mt-0.5 space-y-0.5">
            {kids.map((k) => renderCategoryRow(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // ---------- Reusable sidebar body ----------
  const sidebarBody = (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Expand all"
            title="Expand all"
          >
            <UnfoldMore fontSize="small" />
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Collapse all"
            title="Collapse all"
          >
            <UnfoldLess fontSize="small" />
          </button>
        </div>
      </div>

      {topLevel.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <nav aria-label="Category navigation">
          <ul className="space-y-0.5">
            {topLevel.map((c) => renderCategoryRow(c, 0))}
          </ul>
        </nav>
      )}
    </>
  );

  // ---------- Initial / error states ----------
  if (loadingCats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (catError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">{catError}</h1>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-5 py-2 text-primary-foreground hover:bg-primary/90 transition"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedImage = selectedCategory ? catImage(selectedCategory) : null;

  // ---------- Render ----------
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-sm mb-6">
        <ul className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li className="before:content-['/'] before:mx-2">
            <Link href="/category" className="hover:text-primary">
              Categories
            </Link>
          </li>
          {selectedCategory && (
            <li className="before:content-['/'] before:mx-2 text-foreground">
              {selectedCategory.name}
            </li>
          )}
        </ul>
      </nav>

      {/* Mobile-only: categories trigger */}
      <button
        type="button"
        onClick={() => setIsCategoriesSheetOpen(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors md:hidden"
      >
        <MenuIcon fontSize="small" />
        Browse categories
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ---------------- Desktop sidebar ---------------- */}
        <aside className="hidden md:block md:w-64 flex-shrink-0">
          <div className="rounded-lg border border-border bg-background p-3 md:sticky md:top-24">
            {sidebarBody}
          </div>
        </aside>

        {/* ---------------- Main ---------------- */}
        <main className="flex-1 min-w-0">
          {!selectedCategory ? (
            <div className="rounded-lg border border-border bg-background p-10 text-center">
              <h2 className="text-lg font-semibold mb-2">Pick a category</h2>
              <p className="text-sm text-muted-foreground">
                Choose a category from the list to browse its products.
              </p>
            </div>
          ) : (
            <>
              {/* Hero: category image + name */}
              <div className="mb-6 overflow-hidden rounded-xl border border-border bg-background">
                <div className="relative aspect-[16/6] w-full bg-muted/40">
                  {selectedImage ? (
                    <Image
                      src={selectedImage}
                      alt={selectedCategory.name}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 66vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 md:p-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
                      {selectedCategory.name}
                    </h1>
                    {selectedCategory.description && (
                      <p className="mt-1 max-w-2xl text-sm text-white/85 line-clamp-2">
                        {selectedCategory.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-categories pills */}
              {(childrenByParent.get(selectedCategory._id) ?? []).length >
                0 && (
                <div className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold text-foreground">
                    Sub-categories
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {(childrenByParent.get(selectedCategory._id) ?? []).map(
                      (child) => (
                        <li key={child._id}>
                          <Link
                            href={catHref(child)}
                            className="inline-block rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {visible.length}{" "}
                    {visible.length === 1 ? "product" : "products"}
                    {hasFilters && " (filtered)"}
                  </p>
                  {includesDescendants && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Including products from {selectedCategory.name}&apos;s
                      sub-categories.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Clear fontSize="small" />
                      <span>Clear</span>
                    </button>
                  )}

                  <div className="relative">
                    <select
                      title="Sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="appearance-none rounded-md border border-border bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name">Name A–Z</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                      <ExpandMore fontSize="small" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors md:hidden"
                  >
                    <FilterList fontSize="small" />
                    Filters
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Filter panel */}
                <aside
                  className={`md:w-48 flex-shrink-0 ${
                    showFilters ? "block" : "hidden md:block"
                  }`}
                >
                  <div className="rounded-lg border border-border bg-background p-4 md:sticky md:top-24">
                    <h2 className="text-base font-semibold mb-4">Filters</h2>

                    {priceCap > 0 && (
                      <div className="mb-5">
                        <h3 className="text-sm font-medium mb-2">Max price</h3>
                        <input
                          title="Max price"
                          type="range"
                          min={0}
                          max={priceCap}
                          step={100}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>0 F</span>
                          <span className="font-medium text-foreground">
                            {formatPrice(maxPrice)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mb-5">
                      <h3 className="text-sm font-medium mb-2">Availability</h3>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={inStockOnly}
                          onChange={(e) => setInStockOnly(e.target.checked)}
                        />
                        In stock only
                      </label>
                    </div>
                  </div>
                </aside>

                {/* Products */}
                <div className="flex-1 min-w-0">
                  {loadingProducts ? (
                    <div className="flex justify-center py-16">
                      <Spinner size={28} />
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="text-center py-16">
                      <h3 className="text-lg font-medium mb-2">
                        {productsError
                          ? "Could not load products"
                          : "No products found"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {productsError
                          ? productsError
                          : products.length === 0
                            ? "This category doesn't have any products yet."
                            : "Try adjusting your filters."}
                      </p>
                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {visible.map((product: any) => {
                        const title = product.name || "Untitled";
                        const href = `/products/${slugify(title)}/${product._id}`;
                        const imageUrl = product.images?.[0] || null;

                        const displayPrice = pickPrice(
                          product.price,
                          product.listPrice,
                        );
                        const numericListPrice = Number(product.listPrice) || 0;
                        const showListPrice =
                          numericListPrice > displayPrice && displayPrice > 0;
                        const inStock = (product.quantity ?? 0) > 0;

                        return (
                          <Link
                            key={product._id}
                            href={href}
                            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-primary/30 hover:shadow-lg"
                          >
                            <div className="relative aspect-square overflow-hidden bg-muted/30">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={title}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                  No image
                                </div>
                              )}
                              {!inStock && (
                                <span className="absolute right-2 top-2 rounded bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                                  Out of stock
                                </span>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col p-3">
                              <p className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                                {title}
                              </p>

                              <div className="mt-1 flex items-baseline gap-2">
                                {displayPrice > 0 ? (
                                  <span className="text-sm font-semibold text-primary">
                                    {formatPrice(displayPrice)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Price on request
                                  </span>
                                )}
                                {showListPrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(numericListPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile bottom sheet with the category tree */}
      {isMobile && (
        <BottomSheet
          open={isCategoriesSheetOpen}
          onClose={() => setIsCategoriesSheetOpen(false)}
          title="Categories"
        >
          <div className="px-1 pb-4">{sidebarBody}</div>
        </BottomSheet>
      )}
    </div>
  );
}
