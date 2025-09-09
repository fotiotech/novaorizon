import { find_category_attribute_groups } from "@/app/actions/category";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { fetchProducts } from "@/fetch/fetchProducts";
import { useState, useEffect, useCallback } from "react";

interface Attribute {
  code: string;
  name: string;
}

interface AttributeGroup {
  code: string;
  name: string;
  attributes: Attribute[];
  children: AttributeGroup[];
}

// Custom hooks
export function useProductData(dsin: string) {
  const dispatch = useAppDispatch();
  const baseProduct = useAppSelector((s) => s.product?.byId?.[dsin]);
  const [product, setProduct] = useState<any>(baseProduct);
  const [loading, setLoading] = useState(!baseProduct);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dsin) return;

    if (!baseProduct) {
      setLoading(true);
      dispatch(fetchProducts(dsin))
        .catch((err) => {
          console.error("Failed to fetch product", err);
          setError("Failed to load product");
        })
        .finally(() => setLoading(false));
    } else {
      setProduct(baseProduct);
    }
  }, [dispatch, dsin, baseProduct]);

  return { product, loading, error, setProduct };
}

export function useAttributeGroups(categoryId: string) {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);

  useEffect(() => {
    if (!categoryId) return;

    (async () => {
      try {
        const res = await find_category_attribute_groups(categoryId);
        if (Array.isArray(res)) {
          setGroups(res);
        } else {
          console.warn("findGroup returned unexpected format", res);
          setGroups([]);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
        setGroups([]);
      }
    })();
  }, [categoryId]);

  return groups;
}

export function useExpandedSections(groups: AttributeGroup[]) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    media_visuals: true,
    basic_information: true,
  });

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    groups.forEach((group) => {
      initialExpanded[group.code] = expandedSections[group.code] || false;
    });
    setExpandedSections((prev) => ({ ...prev, ...initialExpanded }));
  }, [groups]);

  const toggleSection = useCallback((code: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  }, []);

  return { expandedSections, toggleSection };
}
