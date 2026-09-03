"use server";

import { Types } from "mongoose";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty, { ICategoryProperty } from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import "@/models/AttributeGroup";
import "@/models/UnitFamily";

// ---------- Category Property CRUD ----------
export async function getCategoryProperty(id?: string): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return property;
  } else {
    const properties = await CategoryProperty.find().lean();
    return properties;
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
      return subCategories;
    }
    return [];
  } else if (id) {
    const category = await Category.findById(id).populate("property").lean();
    if (!category) return null;
    return category;
  } else if (parentId) {
    const subCategories = await Category.find({ parentId })
      .populate("property")
      .lean();
    return subCategories;
  } else {
    const categories = await Category.find().populate("property").lean();
    return categories;
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

  // 1. Fetch category without populating (avoids strictPopulate errors)
  const category: any = await Category.findById(categoryId).lean();
  if (!category) return [];

  // 2. Fetch the property manually
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

  // ----- Use mappings if present (new structure) -----
  if (property.mappings.length > 0) {
    const result: AttributeSetResult[] = [];

    for (const mapping of property.mappings) {
      // Fetch the full AttributeSet with its groups
      const set = await AttributeSet.findById(mapping.set)
        .populate<{ groups: any[] }>("groups")
        .lean();
      if (!set) continue;

      // ---- 1. Build maps and collect selected group IDs ----
      const groupAttrMap = new Map<string, Map<string, boolean>>();
      const selectedGroupIds = new Set<string>();

      for (const gm of mapping.groups) {
        const groupId = gm.group.toString();
        selectedGroupIds.add(groupId);
        const attrMap = new Map<string, boolean>();
        for (const am of gm.attributes) {
          attrMap.set(am.attribute.toString(), am.isRequired);
        }
        groupAttrMap.set(groupId, attrMap);
      }

      // ---- 2. Collect all attribute subdocuments from this set ----
      const allSubdocs: { id: string; isRequired: boolean; groupId: string }[] =
        [];
      for (const group of set.groups || []) {
        const attrs = group.attributes || [];
        for (const item of attrs) {
          let id: string;
          let isRequired = false;
          if (typeof item === "string") {
            id = item;
          } else if (item.id) {
            id = item.id.toString();
            isRequired = item.isRequired ?? false;
          } else {
            continue;
          }
          allSubdocs.push({ id, isRequired, groupId: group._id.toString() });
        }
      }

      // ---- 3. Fetch all attributes (with unitFamily) ----
      const allAttrIds = allSubdocs.map((s) => s.id);
      const uniqueAttrIds = Array.from(new Set(allAttrIds)).filter((id) =>
        Types.ObjectId.isValid(id),
      );
      const attrDocs: any[] = await Attribute.find({
        _id: { $in: uniqueAttrIds },
      })
        .populate("unitFamily")
        .lean();

      const attrDocMap: Record<string, any> = {};
      for (const doc of attrDocs) {
        attrDocMap[(doc as any)._id.toString()] = doc;
      }

      // ---- 4. Build the group tree (only selected groups) ----
      const buildTree = (
        groups: any[],
        parentId: string | null = null,
      ): GroupNode[] => {
        return groups
          .filter((g) => {
            const gId = g._id.toString();
            if (!selectedGroupIds.has(gId)) return false;
            const gParent = g.parent_id?.toString();
            if (parentId === null) {
              if (!gParent) return true;
              return !selectedGroupIds.has(gParent);
            } else {
              return gParent === parentId;
            }
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((g) => {
            const groupId = g._id.toString();
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
                  id: attrDoc._id.toString(),
                  code: attrDoc.code,
                  name: attrDoc.name,
                  type: attrDoc.type,
                  options: attrDoc.option || [],
                  isRequired: selectedAttrMap.get(sub.id) ?? false,
                  unitFamily: attrDoc.unitFamily
                    ? {
                        id: attrDoc.unitFamily._id.toString(),
                        name: attrDoc.unitFamily.name,
                        baseUnit: attrDoc.unitFamily.baseUnit,
                      }
                    : null,
                  sortOrder: attrDoc.sort_order ?? 0,
                };
              })
              .filter((item): item is MappedAttribute => item !== null);

            return {
              id: groupId,
              code: g.code,
              name: g.name,
              parentId: g.parent_id?.toString() || null,
              sortOrder: g.sort_order ?? 0,
              attributes: attrs,
              children: buildTree(groups, g._id.toString()),
            };
          });
      };

      result.push({
        id: set._id.toString(),
        title: set.title,
        code: set.code,
        groups: buildTree(set.groups || [], null),
      });
    }

    return result;
  }

  // ---- FALLBACK: old 'sets' array (unchanged) ----
  const oldSets = (property as any).sets;
  if (oldSets && Array.isArray(oldSets) && oldSets.length > 0) {
    const setIds = oldSets.map((s: any) => s._id?.toString() || s.toString());
    const attributeSets = await AttributeSet.find({ _id: { $in: setIds } })
      .populate<{ groups: any[] }>("groups")
      .lean();

    const buildTreeFull = (
      groups: any[],
      parentId: string | null = null,
    ): GroupNode[] => {
      const groupIds = new Set(groups.map((g) => g._id.toString()));
      return groups
        .filter((g) => {
          const gParent = g.parent_id?.toString();
          return parentId === null
            ? !gParent || !groupIds.has(gParent)
            : gParent === parentId;
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g) => {
          const attrs: MappedAttribute[] = (g.attributes || [])
            .map((item: any) => {
              let attrDoc = item.id ? item.id : item;
              if (typeof attrDoc === "string") return null;
              if (!attrDoc) return null;
              return {
                id: attrDoc._id.toString(),
                code: attrDoc.code,
                name: attrDoc.name,
                type: attrDoc.type,
                options: attrDoc.option || [],
                isRequired: item.isRequired ?? false,
                unitFamily: attrDoc.unitFamily
                  ? {
                      id: attrDoc.unitFamily._id.toString(),
                      name: attrDoc.unitFamily.name,
                      baseUnit: attrDoc.unitFamily.baseUnit,
                    }
                  : null,
                sortOrder: attrDoc.sort_order ?? 0,
              };
            })
            .filter((item: any): item is MappedAttribute => item !== null);

          return {
            id: g._id.toString(),
            code: g.code,
            name: g.name,
            parentId: g.parent_id?.toString() || null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTreeFull(groups, g._id.toString()),
          };
        });
    };

    return attributeSets.map((set) => ({
      id: set._id.toString(),
      title: set.title,
      code: set.code,
      groups: buildTreeFull(set.groups || [], null),
    }));
  }

  return [];
}
