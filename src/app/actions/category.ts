"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose, { Types } from "mongoose";
import AttributeGroup from "@/models/AttributesGroup";

function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null
) {
  await connection();
  if (name) {
    // Find the category by name
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parent_id: category._id });

      const res = subCategories.map((subCategory) => ({
        ...subCategory?.toObject(),
        _id: subCategory?._id?.toString(),
        parent_id: subCategory?.parent_id?.toString(),
        created_at: subCategory.created_at.toISOString(),
        updated_at: subCategory.updated_at.toISOString(),
      }));

      return res;
    }
  } else if (id) {
    const category = await Category.findById(id);
    if (category) {
      return {
        ...category.toObject(),
        _id: category._id.toString(),
        parent_id: category?.parent_id?.toString(),
        created_at: category.created_at.toISOString(),
        updated_at: category.updated_at.toISOString(),
      };
    }
  } else if (parentId) {
    const subCategories = await Category.find({ parent_id: parentId });
    if (subCategories.length) {
      return subCategories.map((subCategory) => ({
        ...subCategory?.toObject(),
        _id: subCategory._id?.toString(),
        parent_id: subCategory.parent_id?.toString(),
        created_at: subCategory.created_at?.toISOString(),
        updated_at: subCategory.updated_at?.toISOString(),
      }));
    }
  } else {
    const categories = await Category.find();
    return categories.map((category) => ({
      ...category.toObject(),
      _id: category._id.toString(),
      parent_id: category?.parent_id?.toString(),
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
    }));
  }
}

export async function find_category_attribute_groups(
  categoryId: string,
  groupId?: string | null
) {
  if (!categoryId) return [];
  await connection();

  const catObjectId = new Types.ObjectId(categoryId);

  // --- 1) build attributeIds as before (defensive aggregation) ---
  const categories = await Category.aggregate([
    { $match: { _id: catObjectId } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestors",
      },
    },
    {
      $project: {
        allAttributes: {
          $setUnion: [
            { $ifNull: ["$attributes", []] },
            {
              $reduce: {
                input: {
                  $map: {
                    input: { $ifNull: ["$ancestors", []] },
                    as: "a",
                    in: { $ifNull: ["$$a.attributes", []] },
                  },
                },
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          ],
        },
      },
    },
  ]);

  const attributeIds = Array.isArray(categories?.[0]?.allAttributes)
    ? categories[0].allAttributes
    : [];
  if (attributeIds.length === 0) return [];

  if (groupId) {
    const group = await AttributeGroup.find({
      _id: new mongoose.Types.ObjectId(groupId),
      attributes: { $in: attributeIds },
    })
      .populate("attributes") // populate attributes here
      .lean();
    return buildGroupTreeWithValues([group[0]]);
  }

  const groups = await AttributeGroup.find({
    attributes: { $in: attributeIds },
  })
    .populate("attributes") // populate attributes here
    .lean();

  return buildGroupTreeWithValues(groups);
}

const buildGroupTreeWithValues = (
  groups: any[],
  parentId: string | null = null
): any[] => {
  return groups
    .filter(
      (group) =>
        (!parentId && !group.parent_id) ||
        (parentId && group.parent_id?.toString() === parentId)
    )
    .sort((a, b) => a.group_order - b.group_order)
    .map((group) => ({
      _id: group._id?.toString(),
      code: group.code,
      name: group.name,
      parent_id: group.parent_id?.toString(),
      group_order: group.group_order,
      attributes: group.attributes,
      children: buildGroupTreeWithValues(groups, group._id?.toString()),
    }));
};
