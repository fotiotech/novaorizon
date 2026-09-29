import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getCategoriesForTree } from "@/app/actions/category";
import { findProductByCategory } from "@/app/actions/products";
import CategoryClient from "../../_component/CategoryClient";
import {
  buildCategoryTree,
  scopeIds,
  type CategoryNode,
} from "../../_component/_shared";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://novaorizon.vercel.app";

interface Params {
  slug: string;
  _id: string;
}

// Same cached list the index page uses — share the tag so one purge
// refreshes both.
const getCachedCategories = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    try {
      const list = await getCategoriesForTree();
      return Array.isArray(list) ? (list as CategoryNode[]) : [];
    } catch (err) {
      console.error("[category page] failed to load categories:", err);
      return [];
    }
  },
  ["categories-tree"],
  { revalidate: 3600, tags: ["categories"] },
);

async function fetchCategoryAndProducts(id: string) {
  const all = await getCachedCategories();
  const { byId, childrenByParent } = buildCategoryTree(all);
  const selected = byId.get(id) ?? null;

  if (!selected) return { categories: all, category: null, products: [] };

  const ids = scopeIds(selected._id, childrenByParent);

  let products: any[] = [];
  try {
    const data = await findProductByCategory(ids);
    if (Array.isArray(data)) products = data;
    else if (data && typeof (data as any).error === "string") {
      console.error("[category page] products error:", (data as any).error);
    }
  } catch (err) {
    console.error("[category page] failed to load products:", err);
  }

  return { categories: all, category: selected, products };
}

// ---------- metadata ----------
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, _id } = await params;
  const { category } = await fetchCategoryAndProducts(_id);

  if (!category) {
    return {
      title: "Category not found",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/category/${slug}/${_id}`;
  const description = (
    category.description || `Browse products in ${category.name}.`
  ).slice(0, 160);
  const image = category.imageUrl?.[0];

  return {
    title: category.name,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      title: category.name,
      description,
      url: canonicalPath,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: category.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// ---------- page ----------
export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug, _id } = await params;
  const { categories, category, products } =
    await fetchCategoryAndProducts(_id);

  const breadcrumbJsonLd = category
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Categories",
            item: `${SITE_URL}/category`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: category.name,
            item: `${SITE_URL}/category/${slug}/${_id}`,
          },
        ],
      }
    : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <CategoryClient
        initialCategories={categories}
        initialProducts={products}
        categoryId={_id}
      />
    </>
  );
}
