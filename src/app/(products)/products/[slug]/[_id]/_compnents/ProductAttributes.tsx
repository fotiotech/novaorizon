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

// ---------- Section title ----------
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h2 className="mb-3 text-lg font-semibold text-foreground">{children}</h2>
);

// ---------- Bordered 50/50 attribute table ----------
const AttrTable: React.FC<{ items: { k: string; v: any }[] }> = ({ items }) => (
  <table className="w-full border-collapse border border-border">
    <tbody>
      {items.map((item, i) => (
        <tr key={i} className="border-b border-border last:border-b-0">
          <th
            scope="row"
            className="w-1/2 border-r border-border bg-muted/50 px-3 py-2 text-left align-top text-sm font-medium capitalize text-foreground"
          >
            {item.k}
          </th>
          <td className="w-1/2 px-3 py-2 align-top text-sm text-foreground">
            {renderValue(item.v)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

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
    <div className="mt-6 space-y-6">
      {hasKeyFeatures && (
        <div>
          <SectionTitle>Key features</SectionTitle>
          <AttrTable items={keyFeatures} />
        </div>
      )}

      {hasSpecifications && (
        <div>
          {variant === "both" && <SectionTitle>Specifications</SectionTitle>}
          <div className="space-y-5">
            {specifications.map((group, idx) => (
              <div key={idx}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.name}
                </h3>

                {group.attributes.length > 0 && (
                  <AttrTable items={group.attributes} />
                )}

                {group.groups.length > 0 && (
                  <div className="mt-3 space-y-4 border-l-2 border-border pl-4">
                    {group.groups.map((sub: any, subIdx: number) => (
                      <div key={subIdx}>
                        <h4 className="mb-2 text-sm font-medium text-foreground">
                          {sub.name}
                        </h4>
                        <AttrTable items={sub.attributes} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
