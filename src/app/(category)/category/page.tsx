"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FilterList,
  GridView,
  ViewList,
  Sort,
  ExpandMore,
  Star,
  StarHalf,
  ArrowDropDown,
} from "@mui/icons-material";
import { Product, Category } from "@/constant/types";
import { findProductByCategory } from "@/app/actions/products";
import { getCategory } from "@/app/actions/category";

// Define more detailed types
interface ShopProduct extends Product {
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  featured?: boolean;
}

interface ShopCategory extends Category {
  productCount?: number;
}

const ShopCategoryPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get("id");

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Fetch all categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategory();
        setCategories(categoriesData || []);

        // If there's a category ID in the URL, select it
        if (categoryId) {
          const category = categoriesData.find(
            (cat: any) => cat.id === categoryId
          );
          if (category) {
            setSelectedCategory(category);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products when selectedCategory changes
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedCategory) return;

      setProductsLoading(true);
      try {
        const productsData = await findProductByCategory(selectedCategory._id);
        setProducts(productsData || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  // Handle category selection
  const handleCategoryChange = (category: ShopCategory) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    // Update URL without page refresh
    router.push(`/category?id=${category._id}`, { scroll: false });
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Filter by price range
    result = result.filter(
      (product) =>
        product.list_price >= priceRange[0] &&
        product.list_price <= priceRange[1]
    );

    // Filter by stock status
    if (inStockOnly) {
      result = result.filter((product) => product.stock_status.join(", "));
    }

    // Filter by ratings
    if (selectedRatings.length > 0) {
      result = result.filter((product) =>
        selectedRatings.some(
          (rating) => Math.floor(product.rating || 0) === rating
        )
      );
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        result.sort(
          (a, b) =>
            (a.sale_price || a.list_price) - (b.sale_price || b.list_price)
        );
        break;
      case "price-high":
        result.sort(
          (a, b) =>
            (b.sale_price || b.list_price) - (a.sale_price || a.list_price)
        );
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // featured
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [products, sortBy, priceRange, inStockOnly, selectedRatings]);

  // Render star ratings
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="text-yellow-400 text-sm" />);
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf key={fullStars} className="text-yellow-400 text-sm" />
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={fullStars + i + 1} className="text-gray-300 text-sm" />
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-80 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-sm breadcrumbs mb-6">
        <ul className="flex space-x-2 text-gray-600">
          <li>
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
          </li>
          <li className="before:content-['/'] before:mr-2">
            <Link href="/shop" className="hover:text-blue-600">
              Shop
            </Link>
          </li>
          <li className="before:content-['/'] before:mr-2">
            {selectedCategory?.name || "Select a Category"}
          </li>
        </ul>
      </nav>

      {/* Category Selection */}
      <div className="mb-8">
        <div className="relative inline-block">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-4 py-2 text-lg font-semibold hover:border-gray-400"
          >
            {selectedCategory?.name || "Select a Category"}
            <ArrowDropDown />
          </button>

          {/* {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
              {categories.map((category) => (
                <button
                  title="clear"
                  type="button"
                  key={category._id}
                  onClick={() => handleCategoryChange(category)}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    selectedCategory?._id === category._id
                      ? "bg-blue-50 text-blue-600"
                      : ""
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )} */}
        </div>

        {selectedCategory && (
          <p className="text-gray-600 mt-2">{selectedCategory.description}</p>
        )}
      </div>

      {!selectedCategory ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-4">
            Please select a category to view products
          </h2>
          <p className="text-gray-600">
            Choose from the categories above to browse our products.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Filters Sidebar - Hidden on mobile by default */}
            <div
              className={`md:w-1/4 ${
                showFilters ? "block" : "hidden md:block"
              }`}
            >
              <div className="bg-white p-6 rounded-lg shadow-md sticky top-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <button
                    title="clear"
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="md:hidden text-gray-500"
                  >
                    &times;
                  </button>
                </div>

                {/* Price Range Filter */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Price Range</h3>
                  <input
                    title="range"
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([0, parseInt(e.target.value)])
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-sm">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>

                {/* Availability Filter */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Availability</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="mr-2"
                    />
                    In Stock Only
                  </label>
                </div>

                {/* Ratings Filter */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Customer Rating</h3>
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(rating)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRatings([...selectedRatings, rating]);
                          } else {
                            setSelectedRatings(
                              selectedRatings.filter((r) => r !== rating)
                            );
                          }
                        }}
                        className="mr-2"
                      />
                      <div className="flex">{renderRating(rating)}</div>
                      <span className="ml-1 text-sm">& up</span>
                    </label>
                  ))}
                </div>

                <button
                  title="clear"
                  type="button"
                  onClick={() => {
                    setPriceRange([0, 1000]);
                    setInStockOnly(false);
                    setSelectedRatings([]);
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Products Section */}
            <div className="md:w-3/4">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <p className="text-gray-600 mb-4 md:mb-0">
                  Showing {filteredAndSortedProducts.length} of{" "}
                  {products.length} products
                </p>

                <div className="flex items-center gap-4">
                  {/* View Toggle */}
                  <div className="flex border rounded-md overflow-hidden">
                    <button
                      title="clear"
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-2 ${
                        viewMode === "grid" ? "bg-gray-100" : "bg-white"
                      }`}
                    >
                      <GridView />
                    </button>
                    <button
                      title="clear"
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-2 ${
                        viewMode === "list" ? "bg-gray-100" : "bg-white"
                      }`}
                    >
                      <ViewList />
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      title="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none border rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Customer Rating</option>
                      <option value="name">Name A-Z</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ExpandMore />
                    </div>
                  </div>

                  {/* Mobile Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="md:hidden flex items-center gap-1 border rounded-md px-3 py-2 text-sm"
                  >
                    <FilterList /> Filters
                  </button>
                </div>
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg overflow-hidden shadow-md animate-pulse"
                    >
                      <div className="bg-gray-200 h-48 w-full"></div>
                      <div className="p-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters to see more results.
                  </p>
                  <button
                    title="clear"
                    type="button"
                    onClick={() => {
                      setPriceRange([0, 1000]);
                      setInStockOnly(false);
                      setSelectedRatings([]);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-6"
                  }
                >
                  {filteredAndSortedProducts.map((product) => (
                    <div
                      key={product._id}
                      className={
                        viewMode === "grid"
                          ? "bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                          : "bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow flex"
                      }
                    >
                      <div
                        className={
                          viewMode === "grid"
                            ? "relative h-48 w-full"
                            : "relative h-48 w-48 flex-shrink-0"
                        }
                      >
                        <Image
                          src={product.main_image || "/placeholder-product.jpg"}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                        {!product.stock_status && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                            Out of Stock
                          </div>
                        )}
                        {product.featured && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Featured
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {product.title}
                        </h3>

                        <div className="flex items-center mb-2">
                          <div className="flex">
                            {renderRating(product.rating || 0)}
                          </div>
                          <span className="text-gray-600 text-sm ml-1">
                            ({product.reviewCount || 0})
                          </span>
                        </div>

                        <div className="flex items-center mt-3">
                          {product.sale_price ? (
                            <>
                              <span className="text-xl font-bold">
                                ${product.sale_price}
                              </span>
                              <span className="text-gray-500 line-through ml-2">
                                ${product.list_price}
                              </span>
                              <span className="text-red-500 font-medium ml-2 text-sm">
                                {Math.round(
                                  (1 -
                                    product.sale_price / product.list_price) *
                                    100
                                )}
                                % off
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold">
                              ${product.list_price}
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <button
                            disabled={!product.stock_status}
                            className={`w-full py-2 rounded-md text-sm ${
                              product.stock_status === "In Stock"
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {product.stock_status
                              ? "Add to Cart"
                              : "Out of Stock"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination would go here */}
              {filteredAndSortedProducts.length > 0 && (
                <div className="flex justify-center mt-8">
                  <div className="flex gap-1">
                    <button className="px-3 py-1 border rounded-md text-sm">
                      1
                    </button>
                    <button className="px-3 py-1 border rounded-md bg-blue-600 text-white text-sm">
                      2
                    </button>
                    <button className="px-3 py-1 border rounded-md text-sm">
                      3
                    </button>
                    <button className="px-3 py-1 border rounded-md text-sm">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShopCategoryPage;
