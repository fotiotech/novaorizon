export type CategoryNode = {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string[];
  description?: string;
  sortOrder?: number;
};

export type SortKey = "featured" | "price-low" | "price-high" | "name";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function catHref(cat: CategoryNode): string {
  const slug = cat.slug || slugify(cat.name || "");
  return `/category/${slug}/${cat._id}`;
}

export function catImage(cat: CategoryNode): string | null {
  return cat.imageUrl?.[0] ?? null;
}

export function formatPrice(value: any): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString("en-US")} F`;
}

export function pickPrice(...candidates: any[]): number {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Build lookup structures from a flat category list.
export function buildCategoryTree(all: CategoryNode[]) {
  const byId = new Map<string, CategoryNode>();
  const childrenByParent = new Map<string, CategoryNode[]>();
  const topLevel: CategoryNode[] = [];

  for (const c of all) byId.set(c._id, c);
  for (const c of all) {
    const pid = c.parentId;
    if (!pid || !byId.has(pid)) topLevel.push(c);
    else {
      const arr = childrenByParent.get(pid) ?? [];
      arr.push(c);
      childrenByParent.set(pid, arr);
    }
  }

  const byOrder = (a: CategoryNode, b: CategoryNode) => {
    const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  };
  topLevel.sort(byOrder);
  for (const arr of childrenByParent.values()) arr.sort(byOrder);

  return { byId, childrenByParent, topLevel };
}

// Every descendant ID of a category (inclusive of itself).
export function scopeIds(
  rootId: string,
  childrenByParent: Map<string, CategoryNode[]>,
): string[] {
  const ids: string[] = [rootId];
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const k of childrenByParent.get(cur) ?? []) {
      ids.push(k._id);
      stack.push(k._id);
    }
  }
  return ids;
}
