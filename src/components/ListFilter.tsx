import React, { useEffect, useRef } from "react";
import useClickOutside, { useScreenSize } from "./Hooks";

type Filter = {
  _id: string;
  name: string;
  count: number;
};

type FilterListProps = {
  openClose: boolean;
  setOpenClose: React.Dispatch<React.SetStateAction<boolean>>;
  filters: {
    categories: Filter[];
    brands: Filter[];
    priceRange: { min: number; max: number };
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
    if (typeof window === 'undefined') return;

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

  // Prevent initial animation on mount
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
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
              : "relative w-60"
          }
          bg-surface p-6 lg:p-4 lg:rounded-none rounded-t-2xl shadow-xl lg:shadow-none border-thi lg:border-none border-2
          ${initialRender.current ? "lg:block" : ""}
        `}
      >
        {/* Mobile Header */}
        {screenSize <= 1024 && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h3 className="font-semibold text-xl">Filters</h3>
            <button
              onClick={() => setOpenClose(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close filters"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Desktop Header */}
        {screenSize > 1024 && (
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Filter List</h3>
          </div>
        )}

        {filters && (
          <div className={`overflow-y-auto ${screenSize <= 1024 ? "h-[calc(100vh-120px)]" : "max-h-96"} pr-2`}>
            {/* Categories */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">Categories</h3>
              <ul className="space-y-2">
                {filters.categories?.map((category) => (
                  <li key={category._id}>
                    <button
                      onClick={() => handleFilterClick("category", category._id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex justify-between items-center group"
                    >
                      <span className="group-hover:text-primary">{category.name}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-8 text-center">
                        {category.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brands */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">Brands</h3>
              <ul className="space-y-2">
                {filters.brands?.map((brand) => (
                  <li key={brand._id}>
                    <button
                      onClick={() => handleFilterClick("brand", brand._id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex justify-between items-center group"
                    >
                      <span className="group-hover:text-primary">{brand.name}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-8 text-center">
                        {brand.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">Price Range</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Min: ${filters?.priceRange?.min}</span>
                  <span className="text-sm font-medium">Max: ${filters?.priceRange?.max}</span>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary">
                        ${filters?.priceRange?.min} - ${filters?.priceRange?.max}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            {screenSize <= 1024 && (
              <div className="sticky bottom-0 bg-surface pt-4 pb-2 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={() => setOpenClose(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Add your apply filters logic here
                      setOpenClose(false);
                    }}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
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