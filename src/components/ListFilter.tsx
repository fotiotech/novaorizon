// components/ListFilter.tsx
"use client";

import React from "react";
import BottomSheet from "@/components/ux/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";

type Filter = {
  _id: string;
  name: string;
  count: number;
};

// Attribute filter option — flat model. `key` IS the product root field
// (e.g. "color", "material"). No `scope` because there are no nested
// keyFeatures/specifications/variants attribute paths anymore.
type AttributeFilterOption = {
  key: string;
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
  handleFilterClick: (key: string, value: string) => void;
};

const ListFilter = ({
  openClose,
  setOpenClose,
  filters,
  handleFilterClick,
}: FilterListProps) => {
  // <= 1023px → bottom sheet; >= 1024px → sidebar.
  const isMobile = useIsMobile(1023);

  // ── Mobile: bottom sheet ──────────────────────────────────────────
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
          handleFilterClick={handleFilterClick}
          onDone={() => setOpenClose(false)}
          mobile
        />
      </BottomSheet>
    );
  }

  // ── Desktop: sidebar ──────────────────────────────────────────────
  return (
    <div className="relative w-64 shrink-0 bg-background p-4 border-r border-border">
      <div className="mb-4 pb-3 border-b border-border">
        <h3 className="font-semibold text-lg text-foreground">Filter List</h3>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
        <FilterContent
          filters={filters}
          handleFilterClick={handleFilterClick}
        />
      </div>
    </div>
  );
};

export default ListFilter;

// ─────────────────────────────────────────────────────────────────────
// Content — shared between sheet (mobile) and sidebar (desktop)
// ─────────────────────────────────────────────────────────────────────
interface FilterContentProps {
  filters: FilterListProps["filters"];
  handleFilterClick: (key: string, value: string) => void;
  onDone?: () => void;
  mobile?: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  handleFilterClick,
  onDone,
  mobile,
}) => {
  return (
    <>
      {/* Categories */}
      <div className="mb-6">
        <h4 className="font-bold text-base text-foreground mb-3">Categories</h4>
        <ul className="space-y-1">
          {filters.categories?.map((category) => (
            <li key={category._id}>
              <button
                onClick={() => handleFilterClick("category", category._id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex justify-between items-center group"
              >
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full min-w-8 text-center">
                  {category.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      <div className="mb-6">
        <h4 className="font-bold text-base text-foreground mb-3">Brands</h4>
        <ul className="space-y-1">
          {filters.brands?.map((brand) => (
            <li key={brand._id}>
              <button
                onClick={() => handleFilterClick("brand", brand._id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex justify-between items-center group"
              >
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {brand.name}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full min-w-8 text-center">
                  {brand.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Attribute filters — flat model: URL key is `attr_<code>` */}
      {filters.attributes && filters.attributes.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-base text-foreground mb-3">
            Attributes
          </h4>
          {filters.attributes.map((attr) => (
            <div key={attr.key} className="mb-4">
              <h5 className="font-medium text-sm text-muted-foreground uppercase mb-2">
                {attr.key}
              </h5>
              <ul className="space-y-1">
                {attr.values.map((val) => (
                  <li key={val.value}>
                    <button
                      onClick={() =>
                        handleFilterClick(`attr_${attr.key}`, val.value)
                      }
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex justify-between items-center group"
                    >
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {val.value}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full min-w-8 text-center">
                        {val.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Price Range */}
      <div className="mb-6">
        <h4 className="font-bold text-base text-foreground mb-3">
          Price Range
        </h4>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Min: F{filters?.priceRange?.min}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              Max: F{filters?.priceRange?.max}
            </span>
          </div>
          <div className="text-xs font-semibold text-primary">
            F{filters?.priceRange?.min} - F{filters?.priceRange?.max}
          </div>
        </div>
      </div>

      {/* Mobile-only action row */}
      {mobile && onDone && (
        <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border">
          <div className="flex gap-3">
            <button
              onClick={onDone}
              className="flex-1 px-4 py-3 border border-input rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDone}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
};
