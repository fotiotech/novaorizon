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
  handleFilterClick: (key: string, value: string) => void;
};

const ListFilter = ({
  openClose,
  setOpenClose,
  filters,
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
          handleFilterClick={handleFilterClick}
        />
      </div>
    </div>
  );
};

export default ListFilter;

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
  // Set of attribute keys that are currently expanded.
  // Collapsed by default → cleaner panel when there are many attributes.
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());

  const toggleAttr = (key: string) => {
    setExpandedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      {/* Categories */}
      <div className="mb-5">
        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Categories
        </h4>
        <ul className="space-y-0.5">
          {filters.categories?.map((category) => (
            <li key={category._id}>
              <button
                onClick={() => handleFilterClick("category", category._id)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex justify-between items-center gap-2 group"
              >
                <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {category.name}
                </span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                  {category.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      <div className="mb-5">
        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Brands
        </h4>
        <ul className="space-y-0.5">
          {filters.brands?.map((brand) => (
            <li key={brand._id}>
              <button
                onClick={() => handleFilterClick("brand", brand._id)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex justify-between items-center gap-2 group"
              >
                <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {brand.name}
                </span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                  {brand.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Attributes — collapsible per attribute */}
      {filters.attributes && filters.attributes.length > 0 && (
        <div className="mb-5">
          <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Attributes
          </h4>
          {filters.attributes.map((attr) => {
            const isExpanded = expandedAttrs.has(attr.key);
            return (
              <div
                key={attr.key}
                className="mb-1.5 border-b border-border last:border-b-0 pb-1.5"
              >
                {/* Collapsible header */}
                <button
                  type="button"
                  onClick={() => toggleAttr(attr.key)}
                  aria-expanded={isExpanded}
                  aria-controls={`attr-panel-${attr.key}`}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors group"
                >
                  <span className="text-[11px] font-medium text-foreground text-left truncate">
                    {attr.name}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Collapsible body */}
                <div
                  id={`attr-panel-${attr.key}`}
                  hidden={!isExpanded}
                  className="pt-1"
                >
                  <ul className="space-y-0.5">
                    {attr.values.map((val) => (
                      <li key={val.value}>
                        <button
                          onClick={() =>
                            handleFilterClick(`attr_${attr.key}`, val.value)
                          }
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex justify-between items-center gap-2 group"
                        >
                          <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {val.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-6 text-center shrink-0">
                            {val.count}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Price Range */}
      <div className="mb-5">
        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Price Range
        </h4>
        <div className="bg-muted/30 rounded-md p-3 border border-border">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-muted-foreground">
              Min: F{filters?.priceRange?.min} F
            </span>
            <span className="text-[11px] text-muted-foreground">
              Max: {filters?.priceRange?.max} F
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
