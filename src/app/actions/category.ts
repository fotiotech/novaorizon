"use server";

import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/UnitFamily";

// ==================================================================
// ID COERCION
// ==================================================================
function bufferLikeToHex(obj: any): string {
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

  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._bsontype === "ObjectId") {
    const inner = value.id;
    if (typeof inner === "string") return inner;
    if (inner && typeof inner === "object") {
      if (Buffer.isBuffer?.(inner)) return inner.toString("hex");
      if ("buffer" in inner) return bufferLikeToHex(inner.buffer);
      if (Array.isArray(inner.data))
        return Buffer.from(inner.data).toString("hex");
    }
    return String(value);
  }

  if (value.buffer && typeof value.buffer === "object") {
    const hex = bufferLikeToHex(value.buffer);
    if (hex) return hex;
  }

  if (value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("hex");
  }

  if (value.$oid) return String(value.$oid);
  if (value._id !== undefined) return coerceId(value._id);
  if (value.id !== undefined) return coerceId(value.id);

  return "";
}

function isValidId(id: string): boolean {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

function toPlain(value: any): any {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
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

// ==================================================================
// TYPES
// ==================================================================
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
  isHighlight: boolean;
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
  sortOrder: number;
  groups: GroupNode[];
}

// ==================================================================
// CORE BUILDER — same logic as admin, coercion-safe
//
// Each mapped attribute carries two flags:
//   isRequired  — from the property editor
//   isHighlight — from the property editor, drives Key Features on
//                 the storefront (see ProductAttributes.tsx)
// ==================================================================
async function buildAttributeSetsFromMappings(
  mappings: {
    set: string;
    groups: {
      group: string;
      attributes: {
        attribute: string;
        isRequired?: boolean;
        isHighlight?: boolean;
      }[];
    }[];
  }[],
): Promise<AttributeSetResult[]> {
  const result: AttributeSetResult[] = [];

  for (const mapping of mappings) {
    const setId = coerceId(mapping.set);
    if (!isValidId(setId)) continue;

    const set: any = await AttributeSet.findById(setId).lean();
    if (!set) continue;

    const groupIds = (mapping.groups || [])
      .map((g) => coerceId(g.group))
      .filter(isValidId);
    if (groupIds.length === 0) continue;

    const groups: any[] =
      groupIds.length > 0
        ? await AttributeGroup.find({ _id: { $in: groupIds } }).lean()
        : [];

    // ---- Collect attribute IDs + flags from the mapping ----
    const attrRequiredMap = new Map<string, boolean>();
    const attrHighlightMap = new Map<string, boolean>();
    const groupAttrIds = new Map<string, string[]>(); // groupId -> [attrId]
    const selectedGroupIds = new Set<string>();

    for (const gm of mapping.groups || []) {
      const groupId = coerceId(gm.group);
      if (!isValidId(groupId)) continue;
      selectedGroupIds.add(groupId);

      const attrList: string[] = [];
      for (const am of gm.attributes || []) {
        const attrId = coerceId((am as any).attribute);
        if (!isValidId(attrId)) continue;
        attrRequiredMap.set(attrId, !!(am as any).isRequired);
        attrHighlightMap.set(attrId, !!(am as any).isHighlight);
        attrList.push(attrId);
      }
      groupAttrIds.set(groupId, attrList);
    }

    const allAttrIds = Array.from(attrRequiredMap.keys());

    const attrDocs: any[] =
      allAttrIds.length > 0
        ? await Attribute.find({ _id: { $in: allAttrIds } })
            .populate("unitFamily")
            .lean()
        : [];

    const attrDocMap = new Map<string, any>();
    for (const doc of attrDocs) attrDocMap.set(coerceId(doc._id), doc);

    // ---- Build the group tree ----
    const buildTree = (parentId: string | null = null): GroupNode[] => {
      return groups
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
          const attrIds = groupAttrIds.get(groupId) || [];

          const attrs: MappedAttribute[] = attrIds
            .map((attrId) => {
              const doc = attrDocMap.get(attrId);
              if (!doc) return null;
              return {
                id: coerceId(doc._id),
                code: String(doc.code ?? ""),
                name: String(doc.name ?? ""),
                type: String(doc.type ?? ""),
                options: Array.isArray(doc.option)
                  ? doc.option.map((o: any) => String(o))
                  : [],
                isRequired: attrRequiredMap.get(attrId) ?? false,
                isHighlight: attrHighlightMap.get(attrId) ?? false,
                unitFamily: doc.unitFamily
                  ? {
                      id: coerceId(doc.unitFamily._id),
                      name: String(doc.unitFamily.name ?? ""),
                      baseUnit: String(doc.unitFamily.baseUnit ?? ""),
                    }
                  : null,
                sortOrder: doc.sort_order ?? 0,
              };
            })
            .filter((a): a is MappedAttribute => a !== null)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return {
            id: groupId,
            code: String(g.code ?? ""),
            name: String(g.name ?? ""),
            parentId: g.parent_id ? coerceId(g.parent_id) : null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTree(groupId),
          };
        });
    };

    result.push({
      id: coerceId(set._id),
      title: String(set.title ?? ""),
      code: String(set.code ?? ""),
      sortOrder: typeof set.sortOrder === "number" ? set.sortOrder : 0,
      groups: buildTree(null),
    });
  }

  // Sort ascending by the set's sortOrder. Sets without a value (or
  // with 0) float to the top, matching the AttributeSet schema default.
  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return result;
}

// ==================================================================
// ANCESTOR PROPERTY COLLECTION
// ==================================================================
async function collectAncestorProperties(categoryId: string): Promise<{
  mappings: any[];
  propertyIds: string[];
}> {
  const propertyIds: string[] = [];
  let current: any = await Category.findById(categoryId)
    .populate("property")
    .lean();
  let depth = 0;
  const visited = new Set<string>();

  while (current && depth < 20 && !visited.has(current._id?.toString())) {
    visited.add(current._id.toString());

    let propertyId: string | null = null;
    if (current.property) {
      if (typeof current.property === "object" && current.property !== null) {
        const propObj = current.property;
        propertyId = coerceId(propObj._id ?? propObj.id ?? propObj);
      } else {
        propertyId = coerceId(current.property);
      }
    }
    if (propertyId && isValidId(propertyId)) propertyIds.push(propertyId);

    const parentId = current.parentId ?? current.parent_id;
    if (!parentId) break;

    current = await Category.findById(parentId).populate("property").lean();
    depth += 1;
  }

  if (propertyIds.length === 0) {
    return { mappings: [], propertyIds: [] };
  }

  const properties = await CategoryProperty.find({
    _id: { $in: propertyIds },
  }).lean();

  // Merge mappings from ancestors, child overrides parent.
  // The attribute entry now carries both flags so `isHighlight` also
  // inherits — a parent highlighting an attribute will highlight it
  // in the child unless the child explicitly clears the flag.
  const combinedMap = new Map<
    string,
    {
      set: string;
      groups: Map<
        string,
        {
          group: string;
          attributes: Map<
            string,
            { isRequired: boolean; isHighlight: boolean }
          >;
        }
      >;
    }
  >();

  for (const prop of properties.reverse()) {
    if (!prop.mappings || !Array.isArray(prop.mappings)) continue;
    for (const mapping of prop.mappings) {
      const setKey = coerceId(mapping.set);
      if (!isValidId(setKey)) continue;
      if (!combinedMap.has(setKey)) {
        combinedMap.set(setKey, { set: setKey, groups: new Map() });
      }
      const setData = combinedMap.get(setKey)!;
      for (const gm of mapping.groups || []) {
        const groupKey = coerceId(gm.group);
        if (!isValidId(groupKey)) continue;
        if (!setData.groups.has(groupKey)) {
          setData.groups.set(groupKey, {
            group: groupKey,
            attributes: new Map(),
          });
        }
        const groupData = setData.groups.get(groupKey)!;
        for (const am of gm.attributes || []) {
          const attrKey = coerceId(am.attribute);
          if (!isValidId(attrKey)) continue;
          groupData.attributes.set(attrKey, {
            isRequired: !!(am as any).isRequired,
            isHighlight: !!(am as any).isHighlight,
          });
        }
      }
    }
  }

  const mergedMappings = Array.from(combinedMap.values()).map((setData) => ({
    set: setData.set,
    groups: Array.from(setData.groups.values()).map((groupData) => ({
      group: groupData.group,
      attributes: Array.from(groupData.attributes.entries()).map(
        ([attr, flags]) => ({
          attribute: attr,
          isRequired: flags.isRequired,
          isHighlight: flags.isHighlight,
        }),
      ),
    })),
  }));

  return { mappings: mergedMappings, propertyIds };
}

// ==================================================================
// ENSURE INHERITED PROPERTY EXISTS
// ==================================================================
function generatePropertyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

async function ensureCategoryPropertyFromMappings(
  categoryId: string,
  mappings: any[],
): Promise<string | null> {
  const category = await Category.findById(categoryId).select("name");
  if (!category) return null;

  if (mappings.length === 0) {
    await Category.findByIdAndUpdate(categoryId, { $set: { property: null } });
    return null;
  }

  const baseCode = generatePropertyCode(category.name || "") + "_inherited";
  const propertyName = `${category.name} (Inherited)`;
  const propertyDescription = `Auto-generated inherited property for ${category.name}`;

  // Both flags flow through to the persisted inherited property.
  const preparedMappings = mappings.map((m) => ({
    set: new mongoose.Types.ObjectId(m.set),
    groups: m.groups.map((g: any) => ({
      group: new mongoose.Types.ObjectId(g.group),
      attributes: g.attributes.map((a: any) => ({
        attribute: new mongoose.Types.ObjectId(a.attribute),
        isRequired: !!a.isRequired,
        isHighlight: !!a.isHighlight,
      })),
    })),
  }));

  let property = await CategoryProperty.findOne({ code: baseCode });

  if (property) {
    property.name = propertyName;
    property.description = propertyDescription;
    property.mappings = preparedMappings as any;
    await property.save();
  } else {
    property = new CategoryProperty({
      code: baseCode,
      name: propertyName,
      description: propertyDescription,
      mappings: preparedMappings as any,
    });
    await property.save();
  }

  await Category.findByIdAndUpdate(categoryId, {
    $set: { property: property._id },
  });

  return property._id.toString();
}

// ==================================================================
// PUBLIC: getCategoryAttributeSets — inheritance-aware
// ==================================================================
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return [];
  }

  const category: any = await Category.findById(categoryId)
    .select("inheritProperty property")
    .lean();
  if (!category) return [];

  // ---- Inheritance branch ----
  if (category.inheritProperty === true) {
    const { mappings } = await collectAncestorProperties(categoryId);

    if (mappings.length === 0) {
      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: null },
      });
      return [];
    }

    const propId = await ensureCategoryPropertyFromMappings(
      categoryId,
      mappings,
    );
    if (!propId) return [];

    const property: any = await CategoryProperty.findById(propId).lean();
    if (!property) return [];

    return buildAttributeSetsFromMappings(property.mappings || []);
  }

  // ---- Direct property branch ----
  if (!category.property) return [];

  const property: any = await CategoryProperty.findById(
    category.property,
  ).lean();
  if (!property) return [];

  return buildAttributeSetsFromMappings(property.mappings || []);
}

// ==================================================================
// OPTIONAL READS
// ==================================================================
export async function getCategoryProperty(id?: string): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    return property ? toPlain(property) : null;
  }
  const properties = await CategoryProperty.find().lean();
  return toPlain(properties);
}

export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
): Promise<any> {
  await connection();
  if (name) {
    const category = await Category.findOne({ name });
    if (!category) return [];
    const subCategories = await Category.find({ parentId: category._id });
    return toPlain(subCategories);
  }
  if (id) {
    const category = await Category.findById(id).populate("property").lean();
    return category ? toPlain(category) : null;
  }
  if (parentId) {
    const subs = await Category.find({ parentId }).populate("property").lean();
    return toPlain(subs);
  }
  const all = await Category.find().populate("property").lean();
  return toPlain(all);
}

// ==================================================================
// LEAN READ FOR TREE RENDERING (no property populate)
// ==================================================================
export async function getCategoriesForTree(): Promise<
  Array<{
    _id: string;
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string[];
    description?: string;
    sortOrder?: number;
  }>
> {
  await connection();
  const rows = await Category.find(
    {},
    "_id name slug parentId imageUrl description sortOrder",
  )
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return rows.map((c: any) => ({
    _id: String(c._id),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
    parentId: c.parentId ? String(c.parentId) : null,
    imageUrl: Array.isArray(c.imageUrl) ? c.imageUrl.map(String) : [],
    description: c.description ?? undefined,
    sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : undefined,
  }));
}
