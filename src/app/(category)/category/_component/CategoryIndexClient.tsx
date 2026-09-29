"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ExpandMore,
  ExpandLess,
  UnfoldMore,
  UnfoldLess,
  Menu as MenuIcon,
} from "@mui/icons-material";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  buildCategoryTree,
  catHref,
  catImage,
  type CategoryNode,
} from "./_shared";

interface Props {
  initialCategories: CategoryNode[];
}

export default function CategoryIndexClient({ initialCategories }: Props) {
  const isMobile = useIsMobile();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [isCategoriesSheetOpen, setIsCategoriesSheetOpen] = useState(false);

  const { byId, childrenByParent, topLevel } = useMemo(
    () => buildCategoryTree(initialCategories),
    [initialCategories],
  );

  const visibleCards = useMemo(() => {
    if (!selectedParent) return topLevel;
    return childrenByParent.get(selectedParent) ?? [];
  }, [selectedParent, topLevel, childrenByParent]);

  const breadcrumb = useMemo(() => {
    if (!selectedParent) return [] as CategoryNode[];
    const chain: CategoryNode[] = [];
    let curr = byId.get(selectedParent);
    const guard = new Set<string>();
    while (curr && !guard.has(curr._id)) {
      guard.add(curr._id);
      chain.unshift(curr);
      const pid = curr.parentId;
      if (!pid) break;
      curr = byId.get(pid);
    }
    return chain;
  }, [selectedParent, byId]);

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
    for (const c of initialCategories) {
      if (childrenByParent.get(c._id)?.length) all.add(c._id);
    }
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

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

  const renderRow = (cat: CategoryNode, depth = 0): React.ReactNode => {
    const kids = childrenByParent.get(cat._id) ?? [];
    const hasChildren = kids.length > 0;
    const isExpanded = expanded.has(cat._id);
    const isSelected = selectedParent === cat._id;
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
            {kids.map((k) => renderRow(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

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

      <nav aria-label="Category navigation">
        <ul className="space-y-0.5">{topLevel.map((c) => renderRow(c, 0))}</ul>
      </nav>
    </>
  );

  if (initialCategories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          No categories yet
        </h1>
        <p className="text-muted-foreground">
          Check back later once categories have been created.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="text-sm mb-6">
        <ul className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li className="before:content-['/'] before:mx-2">
            <button
              type="button"
              onClick={() => setSelectedParent(null)}
              className={`hover:text-primary ${
                selectedParent === null ? "text-foreground" : ""
              }`}
            >
              Categories
            </button>
          </li>
          {breadcrumb.map((node, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <li key={node._id} className="before:content-['/'] before:mx-2">
                {isLast ? (
                  <span className="text-foreground">{node.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedParent(node._id)}
                    className="hover:text-primary"
                  >
                    {node.name}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setIsCategoriesSheetOpen(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors md:hidden"
      >
        <MenuIcon fontSize="small" />
        Browse categories
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="hidden md:block md:w-64 flex-shrink-0">
          <div className="rounded-lg border border-border bg-background p-3 md:sticky md:top-24">
            {sidebarBody}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              {breadcrumb.length > 0
                ? breadcrumb[breadcrumb.length - 1].name
                : "Browse Categories"}
            </h1>
            {selectedParent && (
              <button
                type="button"
                onClick={() => setSelectedParent(null)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Back to top level
              </button>
            )}
          </div>

          {visibleCards.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-10 text-center">
              <p className="text-sm text-muted-foreground">
                This category has no sub-categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map((cat) => {
                const kids = childrenByParent.get(cat._id) ?? [];
                const hasChildren = kids.length > 0;
                const imageUrl = catImage(cat);

                return (
                  <div
                    key={cat._id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <Link
                      href={catHref(cat)}
                      className="relative block aspect-[16/9] w-full overflow-hidden bg-muted/40"
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={cat.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <Link
                          href={catHref(cat)}
                          className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {cat.name}
                        </Link>

                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedParent(
                                cat._id === selectedParent ? null : cat._id,
                              )
                            }
                            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={
                              cat._id === selectedParent
                                ? "Hide sub-categories"
                                : "Show sub-categories"
                            }
                          >
                            <ExpandMore
                              fontSize="small"
                              className={`transition-transform ${
                                cat._id === selectedParent ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {cat.description && (
                        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                          {cat.description}
                        </p>
                      )}

                      {hasChildren ? (
                        <ul className="mt-auto flex flex-wrap gap-1.5">
                          {kids.slice(0, 6).map((k) => (
                            <li key={k._id}>
                              <Link
                                href={catHref(k)}
                                className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                {k.name}
                              </Link>
                            </li>
                          ))}
                          {kids.length > 6 && (
                            <li>
                              <button
                                type="button"
                                onClick={() => setSelectedParent(cat._id)}
                                className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                +{kids.length - 6} more
                              </button>
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="mt-auto text-xs text-muted-foreground">
                          No sub-categories
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

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
