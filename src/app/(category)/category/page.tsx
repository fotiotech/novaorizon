import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getCategoriesForTree } from "@/app/actions/category";
import CategoryIndexClient from "./_component/CategoryIndexClient";
import type { CategoryNode } from "./_component/_shared";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse Categories",
  description: "Browse all product categories.",
  alternates: { canonical: "/category" },
};

// Cache the flat category list; purge with revalidateTag("categories").
const getCachedCategories = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    try {
      const list = await getCategoriesForTree();
      return Array.isArray(list) ? (list as CategoryNode[]) : [];
    } catch (err) {
      console.error("[category index] failed to load categories:", err);
      return [];
    }
  },
  ["categories-tree"],
  { revalidate: 3600, tags: ["categories"] },
);

export default async function CategoriesIndexPage() {
  const allCategories = await getCachedCategories();
  return <CategoryIndexClient initialCategories={allCategories} />;
}
