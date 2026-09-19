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
    const kf: { k: string; v: any }[] = [];
    const specs: any[] = [];

    // Codes are camelCase in the DB — direct lookup, no conversion.
    const readValue = (code: string) => product?.[code];

    // ---- Specifications: attributes inside the `specifications` set.
    //      Skips any attribute flagged `isHighlight` so it doesn't
    //      duplicate into Specifications after appearing in Key Features.
    const walkSpecs = (group: any): any => {
      const attrs: any[] = [];
      const children: any[] = [];

      (group.attributes || []).forEach((attr: any) => {
        if (attr.isHighlight) return;
        const value = readValue(attr.code);
        if (value === undefined || value === null || value === "") return;
        attrs.push({ k: attr.name || attr.code, v: value });
      });

      (group.children || []).forEach((c: any) => {
        const r = walkSpecs(c);
        if (r.attributes.length || r.groups.length) children.push(r);
      });

      return { name: group.name, attributes: attrs, groups: children };
    };

    // ---- Key Features: every attribute with `isHighlight: true`,
    //      from any set / any group / any depth. Deduped by code.
    const seenKeyFeatureCodes = new Set<string>();

    const collectHighlighted = (group: any) => {
      (group.attributes || []).forEach((attr: any) => {
        if (!attr.isHighlight) return;
        const code = String(attr.code || "");
        if (!code || seenKeyFeatureCodes.has(code)) return;

        const value = readValue(code);
        if (value === undefined || value === null || value === "") return;

        seenKeyFeatureCodes.add(code);
        kf.push({ k: attr.name || code, v: value });
      });
      (group.children || []).forEach(collectHighlighted);
    };

    for (const set of sets) {
      // Key features come from highlighted attributes across every set.
      for (const group of set.groups || []) {
        collectHighlighted(group);
      }

      // Specifications still come from the dedicated `specifications` set.
      if (String(set.code || "") === "specifications") {
        for (const group of set.groups || []) {
          const built = walkSpecs(group);
          if (built.attributes.length || built.groups.length) {
            specs.push(built);
          }
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
