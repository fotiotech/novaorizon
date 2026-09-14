// components/ProductAttributes.tsx (storefront)
"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryAttributeSets } from "@/app/actions/category";

type Variant = "both" | "keyFeatures" | "specifications";

interface ProductAttributesProps {
  product: any;
  /**
   * Which section(s) to render.
   *   "both"           → Key Features + Specifications  (desktop default)
   *   "keyFeatures"    → Key Features only              (mobile inline)
   *   "specifications" → Specifications only            (mobile bottom sheet)
   */
  variant?: Variant;
}

const renderValue = (value: any): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && "value" in value && "unit" in value)
    return `${value.value} ${value.unit}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function ProductAttributes({
  product,
  variant = "both",
}: ProductAttributesProps) {
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const categoryId =
    product?.categoryId?._id ?? product?.categoryId ?? product?.category;

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    getCategoryAttributeSets(String(categoryId))
      .then(setSets)
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const { keyFeatures, specifications } = useMemo(() => {
    const kf: any[] = [];
    const specs: any[] = [];

    // Attribute codes are already camelCase in the DB.
    const readValue = (code: string) => product?.[code];

    const walk = (group: any): any => {
      const attrs: any[] = [];
      const children: any[] = [];

      (group.attributes || []).forEach((attr: any) => {
        const value = readValue(attr.code);
        if (value === undefined || value === null || value === "") return;
        attrs.push({ k: attr.name || attr.code, v: value });
      });

      (group.children || []).forEach((c: any) => {
        const r = walk(c);
        if (r.attributes.length || r.groups.length) children.push(r);
      });

      return { name: group.name, attributes: attrs, groups: children };
    };

    for (const set of sets) {
      const setCode = String(set.code || "");

      if (setCode === "keyFeatures") {
        for (const group of set.groups || []) {
          const collect = (g: any) => {
            (g.attributes || []).forEach((a: any) => {
              const v = readValue(a.code);
              if (v !== undefined && v !== null && v !== "")
                kf.push({ k: a.name || a.code, v });
            });
            (g.children || []).forEach(collect);
          };
          collect(group);
        }
      } else if (setCode === "specifications") {
        for (const group of set.groups || []) {
          const built = walk(group);
          if (built.attributes.length || built.groups.length) specs.push(built);
        }
      }
    }

    return { keyFeatures: kf, specifications: specs };
  }, [sets, product]);

  if (loading) return null;

  const showKeyFeatures = variant === "both" || variant === "keyFeatures";
  const showSpecifications = variant === "both" || variant === "specifications";

  const hasKeyFeatures = showKeyFeatures && keyFeatures.length > 0;
  const hasSpecifications = showSpecifications && specifications.length > 0;

  if (!hasKeyFeatures && !hasSpecifications) return null;

  return (
    <>
      {hasKeyFeatures && (
        <div className="mt-4">
          <h2 className="text-lg font-bold mb-2">Key Features</h2>
          <ul className=" space-y-1">
            {keyFeatures.map((item, i) => (
              <li key={i}>
                <strong>{item.k}:</strong> {renderValue(item.v)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSpecifications && (
        <div className="mt-4">
          {variant === "both" && (
            <h2 className="text-lg font-bold mb-2">Specifications</h2>
          )}
          {specifications.map((group, idx) => (
            <div key={idx} className="mb-4">
              <h3 className="font-semibold text-neutral-600 mb-1">
                {group.name}
              </h3>
              {group.attributes.length > 0 && (
                <table className="min-w-full border-collapse border border-border">
                  <tbody>
                    {group.attributes.map((attr: any, i: number) => (
                      <tr key={i} className="border-b border-border">
                        <th className="py-1 text-left font-medium capitalize w-1/3 bg-muted/50">
                          {attr.k}
                        </th>
                        <td className="py-1 px-3 text-foreground">
                          {renderValue(attr.v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {group.groups.length > 0 && (
                <div className="ml-4">
                  {group.groups.map((sub: any, subIdx: number) => (
                    <div key={subIdx} className="mb-3">
                      <h4 className="font-medium text-neutral-600 mb-1">
                        {sub.name}
                      </h4>
                      <table className="min-w-full border-collapse border border-border">
                        <tbody>
                          {sub.attributes.map((attr: any, i: number) => (
                            <tr key={i} className="border-b border-border">
                              <th className="py-1 text-left font-medium capitalize w-1/3 bg-muted/50">
                                {attr.k}
                              </th>
                              <td className="py-1 px-3 text-foreground">
                                {renderValue(attr.v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
