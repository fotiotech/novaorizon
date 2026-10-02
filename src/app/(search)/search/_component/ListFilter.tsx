"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";

type Filter = {
  _id: string;
  name: string;
  count: number;
};

// Attribute filter option — flat model.
//   key   → attribute code (the product root field, e.g. "color")
//   name  → display label from the attribute config (e.g. "Color")
//   values → every known value, with count of how many current results
//            have it (0 if none)
type AttributeFilterOption = {
  key: string;
  name: string;
  values: { value: string; count: number }[];
};

type FilterListProps = {
  openClose: boolean;
  setOpenClose: React.Dispatch<React.SetStateAction<boolean>>;
  filters: {
    categories: Filter[];
    brands: Filter[];
    priceRange: { min: number; max: number };
    attributes?: AttributeFilterOption[];
  };
  // Current URL filters, keyed the same way handleFilterClick receives
  // them ("category", "brand", "attr_color", …). Values are the
  // already-normalized strings that live in the URL.
  activeFilters: Record<string, string>;
  handleFilterClick: (key: string, value: string) => void;
};

const ListFilter = ({
  openClose,
  setOpenClose,
  filters,
  activeFilters,
  handleFilterClick,
}: FilterListProps) => {
  const isMobile = useIsMobile(1023);

  if (isMobile) {
    return (
      <BottomSheet
        open={openClose}
        onClose={() => setOpenClose(false)}
        title="Filters"
        panelClassName="max-h-[85vh]"
      >
        <FilterContent
          filters={filters}
          activeFilters={activeFilters}
          handleFilterClick={handleFilterClick}
          onDone={() => setOpenClose(false)}
          mobile
        />
      </BottomSheet>
    );
  }

  return (
    <div className="relative w-64 shrink-0 bg-background p-4 border-r border-border">
      <div className="mb-4 pb-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Filter List</h3>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-hide">
        <FilterContent
          filters={filters}
          activeFilters={activeFilters}
          handleFilterClick={handleFilterClick}
        />
      </div>
    </div>
  );
};

export default ListFilter;

interface FilterContentProps {
  filters: FilterListProps["filters"];
  activeFilters: Record<string, string>;
  handleFilterClick: (key: string, value: string) => void;
  onDone?: () => void;
  mobile?: boolean;
}

// Default-open sections. Empty set = everything starts collapsed.
// Add keys here if you ever want a section open on first render.
const DEFAULT_OPEN_SECTIONS = new Set<string>([]);

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  activeFilters,
  handleFilterClick,
  onDone,
  mobile,
}) => {
  // Set of attribute keys that are currently expanded.
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());

  // Set of section keys (categories, brands) that are currently expanded.
  // Not persisted to storage — closing the panel resets it, which is what
  // most users expect from a filter sidebar.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(DEFAULT_OPEN_SECTIONS),
  );

  const toggleAttr = (key: string) => {
    setExpandedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Row styling for an active vs inactive filter button.
  const rowClass = (isActive: boolean) =>
    [
      "w-full text-left px-2 py-1.5 rounded-md transition-colors",
      "flex justify-between items-center gap-2 group",
      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
    ].join(" ");

  const labelClass = (isActive: boolean) =>
    [
      "text-xs transition-colors truncate",
      isActive
        ? "text-primary font-medium"
        : "text-foreground group-hover:text-primary",
    ].join(" ");

  // Shared header for top-level sections (Categories, Brands). Keeps
  // typography, chevron, and aria consistent across both.
  const SectionHeader = ({
    id,
    title,
    count,
    isOpen,
    onToggle,
  }: {
    id: string;
    title: string;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={`section-${id}`}
      className="w-full flex items-center justify-between gap-2 mb-2 px-2 py-1 rounded-md hover:bg-muted transition-colors group"
    >
      <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">{count}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </span>
    </button>
  );

  const isCategoriesOpen = openSections.has("categories");
  const isBrandsOpen = openSections.has("brands");

  return (
    <>
      {/* Categories */}
      {filters.categories && filters.categories.length > 0 && (
        <div className="mb-5">
          <SectionHeader
            id="categories"
            title="Categories"
            count={filters.categories.length}
            isOpen={isCategoriesOpen}
            onToggle={() => toggleSection("categories")}
          />
          <div id="section-categories" hidden={!isCategoriesOpen}>
            <ul className="space-y-0.5">
              {filters.categories.map((category) => {
                const isActive = activeFilters.category === category._id;
                return (
                  <li key={category._id}>
                    <button
                      type="button"
                      onClick={() =>
                        handleFilterClick("category", category._id)
                      }
                      aria-pressed={isActive}
                      className={rowClass(isActive)}
                    >
                      <span className={labelClass(isActive)}>
                        {category.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                        {category.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Brands */}
      {filters.brands && filters.brands.length > 0 && (
        <div className="mb-5">
          <SectionHeader
            id="brands"
            title="Brands"
            count={filters.brands.length}
            isOpen={isBrandsOpen}
            onToggle={() => toggleSection("brands")}
          />
          <div id="section-brands" hidden={!isBrandsOpen}>
            <ul className="space-y-0.5">
              {filters.brands.map((brand) => {
                const isActive = activeFilters.brand === brand._id;
                return (
                  <li key={brand._id}>
                    <button
                      type="button"
                      onClick={() => handleFilterClick("brand", brand._id)}
                      aria-pressed={isActive}
                      className={rowClass(isActive)}
                    >
                      <span className={labelClass(isActive)}>{brand.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                        {brand.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Attributes — collapsible per attribute */}
      {filters.attributes && filters.attributes.length > 0 && (
        <div className="mb-5">
          <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 px-2">
            Attributes
          </h4>
          {filters.attributes.map((attr) => {
            const isExpanded = expandedAttrs.has(attr.key);
            const urlKey = `attr_${attr.key}`;
            const activeValue = activeFilters[urlKey];
            return (
              <div
                key={attr.key}
                className="mb-1.5 border-b border-border last:border-b-0 pb-1.5"
              >
                <button
                  type="button"
                  onClick={() => toggleAttr(attr.key)}
                  aria-expanded={isExpanded}
                  aria-controls={`attr-panel-${attr.key}`}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors group"
                >
                  <span className="text-[11px] font-medium text-foreground text-left truncate">
                    {attr.name}
                    {activeValue && (
                      <span className="ml-1.5 text-[10px] text-primary">
                        · {activeValue}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  id={`attr-panel-${attr.key}`}
                  hidden={!isExpanded}
                  className="pt-1"
                >
                  <ul className="space-y-0.5">
                    {attr.values.map((val) => {
                      const isActive =
                        activeValue === val.value.trim().toLowerCase();
                      return (
                        <li key={val.value}>
                          <button
                            type="button"
                            onClick={() => handleFilterClick(urlKey, val.value)}
                            aria-pressed={isActive}
                            className={rowClass(isActive)}
                          >
                            <span className={labelClass(isActive)}>
                              {val.value}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                              {val.count}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Price Range — display only for now. */}
      <div className="mb-5">
        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 px-2">
          Price Range
        </h4>
        <div className="bg-muted/30 rounded-md p-3 border border-border">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-muted-foreground">
              Min: F{filters?.priceRange?.min}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Max: {filters?.priceRange?.max}
            </span>
          </div>
          <div className="text-xs font-semibold text-primary">
            {filters?.priceRange?.min} F - {filters?.priceRange?.max} F
          </div>
        </div>
      </div>

      {/* Mobile-only action row */}
      {mobile && onDone && (
        <div className="sticky bottom-0 bg-background pt-3 pb-2 border-t border-border">
          <div className="flex gap-2">
            <button
              onClick={onDone}
              className="flex-1 px-3 py-2.5 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDone}
              className="flex-1 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
};
