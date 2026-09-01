"use server";
import { connection } from "@/utils/connection";
import Attribute from "@/models/Attribute";
import Category from "@/models/Category";
import mongoose from "mongoose";

// Function to fetch category attributes and values
export async function findCategoryAttributesAndValues(categoryId: string) {
  await connection();

  const response = await Category.aggregate([
    // Match the specified category by _id
    { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },

    // Lookup attributes directly associated with the selected category
    {
      $lookup: {
        from: "attributes",
        localField: "_id",
        foreignField: "categoryId",
        as: "directAttributes",
      },
    },

    // Use $graphLookup to find the entire category hierarchy
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestry",
      },
    },

    // Lookup attributes within the ancestry hierarchy
    {
      $lookup: {
        from: "attributes",
        localField: "ancestry._id",
        foreignField: "category_id",
        as: "inheritedAttributes",
      },
    },

    // Merge direct and inherited attributes
    {
      $addFields: {
        allAttributes: {
          $concatArrays: ["$directAttributes", "$inheritedAttributes"],
        },
      },
    },

    // Unwind allAttributes to fetch attribute values per attribute
    { $unwind: "$allAttributes" },

    // Lookup attribute values for each attribute
    {
      $lookup: {
        from: "attributevalues",
        localField: "allAttributes._id",
        foreignField: "attribute_id",
        as: "allAttributes.attributeValues",
      },
    },

    // Group attributes by the 'group' field to organize by attribute groups
    {
      $group: {
        _id: {
          categoryId: "$_id",
          groupName: "$allAttributes.group",
        },
        categoryName: { $first: "$categoryName" },
        attributes: {
          $push: {
            attributeId: "$allAttributes._id",
            attributeName: "$allAttributes.name",
            attributeValues: "$allAttributes.attributeValues",
          },
        },
      },
    },

    // Group again to combine all groups under the category
    {
      $group: {
        _id: "$_id.categoryId",
        categoryName: { $first: "$categoryName" },
        groupedAttributes: {
          $push: {
            groupName: "$_id.groupName",
            attributes: "$attributes",
          },
        },
      },
    },

    // Project the final format
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: 1,
        groupedAttributes: 1,
      },
    },
  ]);

  return response;
}
