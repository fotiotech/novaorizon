"use server";
import { connection } from "@/utils/connection";
import AttributeGroup from "@/models/AttributesGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Function to find all available attribute groups
export async function findAllAttributeGroups() {
  await connection();

  // Find distinct groups from the Attribute model
  const groups = await AttributeGroup.find();

  // Return the list of groups
  return groups;
}

export async function findGroup(id?: string) {
  try {
    await connection();

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

    if (id) {
      // Use findById for single document lookup
      const group = await AttributeGroup.findById(id)
        .populate("attributes")
        .sort({ sort_order: 1 })
        .lean()
        .exec();

      if (!group) {
        return { success: false, error: "Group not found" };
      }
      const g = buildGroupTreeWithValues([group]);
      // Wrap single group in array for tree builder
      return g[0];
    }

    // Get all groups when no ID is specified
    const groups = await AttributeGroup.find({})
      .populate("attributes")
      .sort({ sort_order: 1 })
      .lean()
      .exec();

    if (!groups || groups.length === 0) {
      console.error("No groups found");
      return []; // Return empty array instead of undefined
    }

    return buildGroupTreeWithValues(groups);
  } catch (error) {
    console.error("Error finding groups:", error);
    return { success: false, error: "Failed to fetch groups" };
  }
}
