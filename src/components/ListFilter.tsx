import React, { useEffect, useRef } from "react";
import useClickOutside, { useScreenSize } from "./Hooks";
import { X } from "lucide-react";

type Filter = {
  _id: string;
  name: string;
  count: number;
};

// New type for attribute filter options
type AttributeFilterOption = {
  key: string; // e.g., "color"
  scope: string; // "keyFeatures" | "specifications" | "variants"
  values: { value: string; count: number }[];
};

type FilterListProps = {
  openClose: boolean;
  setOpenClose: React.Dispatch<React.SetStateAction<boolean>>;
  filters: {
    categories: Filter[];
    brands: Filter[];
    priceRange: { min: number; max: number };
    // ----- NEW: attribute filters -----
    attributes?: AttributeFilterOption[]; // optional, can be empty
  };
  handleFilterClick: (key: string, value: string) => void;
};

const ListFilter = ({
  openClose,
  setOpenClose,
  filters,
  handleFilterClick,
}: FilterListProps) => {
  const domNode = useClickOutside(() => setOpenClose(false));
  const screenSize = useScreenSize();
  const initialRender = useRef(true);

  // Handle body scroll lock
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (openClose && screenSize <= 1024) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [openClose, screenSize]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenClose(false);
    };
    if (openClose && screenSize <= 1024) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openClose, screenSize, setOpenClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initialRender.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!openClose && screenSize <= 1024) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {openClose && screenSize <= 1024 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setOpenClose(false)}
        />
      )}

      {/* Filter Panel */}
      <div
        ref={domNode}
        className={`
          ${
            screenSize <= 1024
              ? `fixed top-0 left-0 right-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
                  openClose ? "translate-y-0" : "translate-y-full"
                }`
              : "relative w-64"
          }
          bg-background p-6 lg:p-4 rounded-t-2xl lg:rounded-none shadow-xl lg:shadow-none border border-border lg:border-r lg:border-t-0 lg:border-b-0
          ${initialRender.current ? "lg:block" : ""}
        `}
      >
        {/* Mobile Header */}
        {screenSize <= 1024 && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h3 className="font-semibold text-xl text-foreground">Filters</h3>
            <button
              onClick={() => setOpenClose(false)}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close filters"
            >
              <X size={24} />
            </button>
          </div>
        )}

        {/* Desktop Header */}
        {screenSize > 1024 && (
          <div className="mb-4 pb-3 border-b border-border">
            <h3 className="font-semibold text-lg text-foreground">
              Filter List
            </h3>
          </div>
        )}

        {filters && (
          <div
            className={`overflow-y-auto ${
              screenSize <= 1024
                ? "h-[calc(100vh-120px)]"
                : "max-h-[calc(100vh-200px)]"
            } pr-2`}
          >
            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-bold text-base text-foreground mb-3">
                Categories
              </h4>
              <ul className="space-y-1">
                {filters.categories?.map((category) => (
                  <li key={category._id}>
                    <button
                      onClick={() =>
                        handleFilterClick("category", category._id)
                      }
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
              <h4 className="font-bold text-base text-foreground mb-3">
                Brands
              </h4>
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

            {/* ----- NEW: Attribute Filters ----- */}
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
                              handleFilterClick(
                                `attr_${attr.scope}_${attr.key}`,
                                val.value,
                              )
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
                    Min: ${filters?.priceRange?.min}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    Max: ${filters?.priceRange?.max}
                  </span>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary">
                        ${filters?.priceRange?.min} - $
                        {filters?.priceRange?.max}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            {screenSize <= 1024 && (
              <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border">
                <div className="flex gap-3">
                  <button
                    onClick={() => setOpenClose(false)}
                    className="flex-1 px-4 py-3 border border-input rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setOpenClose(false)}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ListFilter;
