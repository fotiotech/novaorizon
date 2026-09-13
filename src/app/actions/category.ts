"use server";

import mongoose, { Types } from "mongoose";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty, { ICategoryProperty } from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/UnitFamily";

// ==================================================================
// ID COERCION
// ==================================================================
/**
 * Convert anything that may represent an ObjectId into a hex string.
 *
 * Handles:
 *   - real ObjectId instances
 *   - hex strings
 *   - { _bsontype: "ObjectId", id: <Buffer|string> }
 *   - { type: "Buffer", data: [bytes] }
 *   - { buffer: { '0': .., '1': .., ..., '11': .. } }   ← the corrupted shape
 *   - { $oid: "…" }
 *   - { _id: <any of the above> }
 */
function bufferLikeToHex(obj: any): string {
  // Numeric-keyed buffer (0..11 for an ObjectId)
  const bytes: number[] = [];
  for (let i = 0; i < 12; i++) {
    const b = obj[i] ?? obj[String(i)];
    if (typeof b !== "number") return "";
    bytes.push(b);
  }
  return Buffer.from(bytes).toString("hex");
}

function coerceId(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  // Real ObjectId
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._bsontype === "ObjectId") {
    const inner = value.id;
    if (typeof inner === "string") return inner;
    if (inner && typeof inner === "object") {
      if (Buffer.isBuffer?.(inner)) return inner.toString("hex");
      if ("buffer" in inner) return bufferLikeToHex(inner.buffer);
      if (Array.isArray(inner.data)) {
        return Buffer.from(inner.data).toString("hex");
      }
    }
    return String(value);
  }

  // { buffer: { '0': .., ..., '11': .. } }
  if (value.buffer && typeof value.buffer === "object") {
    const hex = bufferLikeToHex(value.buffer);
    if (hex) return hex;
  }

  // { type: "Buffer", data: [...] }
  if (value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("hex");
  }

  // { $oid: "..." }
  if (value.$oid) return String(value.$oid);

  // { _id: ... }
  if (value._id !== undefined) return coerceId(value._id);
  if (value.id !== undefined) return coerceId(value.id);

  return "";
}

function isValidId(id: string): boolean {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Deeply convert a value to a plain JSON-safe shape:
 * ObjectId → string, Buffer → hex, Date → ISO, recursive objects/arrays.
 * Use before returning anything from a Server Action to a Client Component.
 */
function toPlain(value: any): any {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._bsontype === "ObjectId") return coerceId(value);
  if (Buffer.isBuffer?.(value)) return value.toString("hex");
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

// ---------- Category Property CRUD ----------
export async function getCategoryProperty(id?: string): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return toPlain(property);
  } else {
    const properties = await CategoryProperty.find().lean();
    return toPlain(properties);
  }
}

// ---------- Category CRUD ----------
export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
): Promise<any> {
  await connection();
  if (name) {
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parentId: category._id });
      return toPlain(subCategories);
    }
    return [];
  } else if (id) {
    const category = await Category.findById(id).populate("property").lean();
    if (!category) return null;
    return toPlain(category);
  } else if (parentId) {
    const subCategories = await Category.find({ parentId })
      .populate("property")
      .lean();
    return toPlain(subCategories);
  } else {
    const categories = await Category.find().populate("property").lean();
    return toPlain(categories);
  }
}

// ---------- Standardized Attribute Set Fetcher ----------

interface AttributeUnitFamily {
  id: string;
  name: string;
  baseUnit: string;
}

interface MappedAttribute {
  id: string;
  code: string;
  name: string;
  type: string;
  options: string[];
  isRequired: boolean;
  unitFamily: AttributeUnitFamily | null;
  sortOrder: number;
}

interface GroupNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: MappedAttribute[];
  children: GroupNode[];
}

interface AttributeSetResult {
  id: string;
  title: string;
  code: string;
  groups: GroupNode[];
}

export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  const category: any = await Category.findById(categoryId).lean();
  if (!category) return [];

  let property: ICategoryProperty | null = null;
  if (category.property) {
    const propertyDoc = await CategoryProperty.findById(
      category.property,
    ).lean();
    if (propertyDoc && !Array.isArray(propertyDoc)) {
      property = propertyDoc as unknown as ICategoryProperty;
    }
  }
  if (!property || !Array.isArray(property.mappings)) return [];

  // ----- New structure: mappings -----
  if (property.mappings.length > 0) {
    const result: AttributeSetResult[] = [];

    for (const mapping of property.mappings) {
      const setId = coerceId(mapping.set);
      if (!isValidId(setId)) continue;

      // Fetch the set WITHOUT populate (avoids CastError on malformed ids).
      const set: any = await AttributeSet.findById(setId).lean();
      if (!set) continue;

      // Fetch groups manually — coerce ids first, skip invalid ones.
      const rawGroupIds: any[] = Array.isArray(set.groups) ? set.groups : [];
      const groupIds = rawGroupIds
        .map((g: any) => coerceId(g))
        .filter((id: string) => isValidId(id));

      const groups: any[] =
        groupIds.length > 0
          ? await AttributeGroup.find({ _id: { $in: groupIds } }).lean()
          : [];

      // ---- 1. Build maps and collect selected group IDs ----
      const groupAttrMap = new Map<string, Map<string, boolean>>();
      const selectedGroupIds = new Set<string>();

      for (const gm of mapping.groups || []) {
        const groupId = coerceId(gm.group);
        if (!isValidId(groupId)) continue;
        selectedGroupIds.add(groupId);
        const attrMap = new Map<string, boolean>();
        for (const am of gm.attributes || []) {
          const attrId = coerceId(am.attribute);
          if (!isValidId(attrId)) continue;
          attrMap.set(attrId, !!am.isRequired);
        }
        groupAttrMap.set(groupId, attrMap);
      }

      // ---- 2. Collect all attribute subdocs from this set ----
      const allSubdocs: {
        id: string;
        isRequired: boolean;
        groupId: string;
      }[] = [];

      for (const group of groups) {
        const groupId = coerceId(group._id);
        const attrs: any[] = group.attributes || [];
        for (const item of attrs) {
          let id: string;
          let isRequired = false;
          if (typeof item === "string") {
            id = item;
          } else if (item && typeof item === "object") {
            id = coerceId(item.id ?? item._id ?? item);
            isRequired = item.isRequired ?? false;
          } else {
            continue;
          }
          if (!isValidId(id)) continue;
          allSubdocs.push({ id, isRequired, groupId });
        }
      }

      // ---- 3. Fetch all attributes ----
      const uniqueAttrIds = Array.from(new Set(allSubdocs.map((s) => s.id)));
      const attrDocs: any[] =
        uniqueAttrIds.length > 0
          ? await Attribute.find({ _id: { $in: uniqueAttrIds } })
              .populate("unitFamily")
              .lean()
          : [];

      const attrDocMap: Record<string, any> = {};
      for (const doc of attrDocs) {
        attrDocMap[coerceId(doc._id)] = doc;
      }

      // ---- 4. Build the group tree ----
      const buildTree = (
        allGroups: any[],
        parentId: string | null = null,
      ): GroupNode[] => {
        return allGroups
          .filter((g) => {
            const gId = coerceId(g._id);
            if (!selectedGroupIds.has(gId)) return false;
            const gParent = g.parent_id ? coerceId(g.parent_id) : null;
            if (parentId === null) {
              if (!gParent) return true;
              return !selectedGroupIds.has(gParent);
            }
            return gParent === parentId;
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((g) => {
            const groupId = coerceId(g._id);
            const selectedAttrMap = groupAttrMap.get(groupId) || new Map();
            const groupSubdocs = allSubdocs.filter(
              (s) => s.groupId === groupId,
            );
            const validSubdocs = groupSubdocs.filter((s) =>
              selectedAttrMap.has(s.id),
            );

            const attrs: MappedAttribute[] = validSubdocs
              .map((sub) => {
                const attrDoc = attrDocMap[sub.id];
                if (!attrDoc) return null;
                return {
                  id: coerceId(attrDoc._id),
                  code: String(attrDoc.code ?? ""),
                  name: String(attrDoc.name ?? ""),
                  type: String(attrDoc.type ?? ""),
                  options: Array.isArray(attrDoc.option)
                    ? attrDoc.option.map((o: any) => String(o))
                    : [],
                  isRequired: selectedAttrMap.get(sub.id) ?? false,
                  unitFamily: attrDoc.unitFamily
                    ? {
                        id: coerceId(attrDoc.unitFamily._id),
                        name: String(attrDoc.unitFamily.name ?? ""),
                        baseUnit: String(attrDoc.unitFamily.baseUnit ?? ""),
                      }
                    : null,
                  sortOrder: attrDoc.sort_order ?? 0,
                };
              })
              .filter((item): item is MappedAttribute => item !== null);

            return {
              id: groupId,
              code: String(g.code ?? ""),
              name: String(g.name ?? ""),
              parentId: g.parent_id ? coerceId(g.parent_id) : null,
              sortOrder: g.sort_order ?? 0,
              attributes: attrs,
              children: buildTree(allGroups, groupId),
            };
          });
      };

      result.push({
        id: coerceId(set._id),
        title: String(set.title ?? ""),
        code: String(set.code ?? ""),
        groups: buildTree(groups, null),
      });
    }

    return result;
  }

  // ---- Fallback: old 'sets' array ----
  const oldSets = (property as any).sets;
  if (Array.isArray(oldSets) && oldSets.length > 0) {
    const setIds = oldSets
      .map((s: any) => coerceId(s?._id ?? s))
      .filter(isValidId);

    if (setIds.length === 0) return [];

    const attributeSets: any[] = await AttributeSet.find({
      _id: { $in: setIds },
    }).lean();

    const buildTreeFull = (
      allGroups: any[],
      parentId: string | null = null,
    ): GroupNode[] => {
      const groupIds = new Set(allGroups.map((g) => coerceId(g._id)));
      return allGroups
        .filter((g) => {
          const gParent = g.parent_id ? coerceId(g.parent_id) : null;
          return parentId === null
            ? !gParent || !groupIds.has(gParent)
            : gParent === parentId;
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g) => {
          const attrs: MappedAttribute[] = (g.attributes || [])
            .map((item: any) => {
              const attrDoc =
                item && typeof item === "object" && item.id ? item.id : item;
              if (typeof attrDoc === "string") return null;
              if (!attrDoc) return null;
              return {
                id: coerceId(attrDoc._id),
                code: String(attrDoc.code ?? ""),
                name: String(attrDoc.name ?? ""),
                type: String(attrDoc.type ?? ""),
                options: Array.isArray(attrDoc.option)
                  ? attrDoc.option.map((o: any) => String(o))
                  : [],
                isRequired: item.isRequired ?? false,
                unitFamily: attrDoc.unitFamily
                  ? {
                      id: coerceId(attrDoc.unitFamily._id),
                      name: String(attrDoc.unitFamily.name ?? ""),
                      baseUnit: String(attrDoc.unitFamily.baseUnit ?? ""),
                    }
                  : null,
                sortOrder: attrDoc.sort_order ?? 0,
              };
            })
            .filter((item: any): item is MappedAttribute => item !== null);

          return {
            id: coerceId(g._id),
            code: String(g.code ?? ""),
            name: String(g.name ?? ""),
            parentId: g.parent_id ? coerceId(g.parent_id) : null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTreeFull(allGroups, coerceId(g._id)),
          };
        });
    };

    return attributeSets.map((set) => ({
      id: coerceId(set._id),
      title: String(set.title ?? ""),
      code: String(set.code ?? ""),
      groups: buildTreeFull(set.groups || [], null),
    }));
  }

  return [];
}
