// components/ProductAttributes.tsx (storefront)
"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryAttributeSets } from "@/app/actions/category";

const toCamel = (code: string) =>
  code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const renderValue = (value: any): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && "value" in value && "unit" in value)
    return `${value.value} ${value.unit}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function ProductAttributes({ product }: { product: any }) {
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

    const readValue = (code: string) => product?.[toCamel(code)];

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
      const code = toCamel(String(set.code || ""));
      if (code === "keyFeatures") {
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
      } else if (code === "specifications") {
        for (const group of set.groups || []) {
          const built = walk(group);
          if (built.attributes.length || built.groups.length) specs.push(built);
        }
      }
    }

    return { keyFeatures: kf, specifications: specs };
  }, [sets, product]);

  if (loading) return null;
  if (!keyFeatures.length && !specifications.length) return null;

  return (
    <>
      {keyFeatures.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Key Features</h2>
          <ul className="list-disc space-y-1">
            {keyFeatures.map((item, i) => (
              <li key={i}>
                <strong>{item.k}:</strong> {renderValue(item.v)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {specifications.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Specifications</h2>
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
