"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import {
  getModelForTargetType,
  buildQueryFromRules,
} from "@/lib/collection-helpers";

// ---------- Resolve items from a collection ----------
async function resolveCollectionItems(collectionId: string) {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection) return [];

  const targetType = collection.targetType;
  const Model = getModelForTargetType(targetType);
  if (!Model) return [];

  let items: any[] = [];

  if (collection.type === "rule") {
    const query = buildQueryFromRules(collection.rules, targetType);
    if (Object.keys(query).length === 0) return [];
    items = await (Model as mongoose.Model<any>).find(query).limit(50).lean();
  } else {
    // manual
    items = await (Model as mongoose.Model<any>)
      .find({ _id: { $in: collection.items } })
      .lean();
  }

  // Normalize items: extract name, image (use main_image for products), contentType
  return items.map((item: any) => {
    const name = item.name || item.title || "Unnamed";
    let image: string | null = null;

    // Handle different image fields based on target type
    if (targetType === "Product") {
      image = item.main_image || item.image || item.imageUrl || null;
    } else if (targetType === "Collection") {
      image = item.imageUrl || item.image || null;
    } else {
      // For other types (Category, Brand, Promotion, Page)
      image = item.image || item.imageUrl || item.backgroundImage || null;
    }

    return {
      _id: item._id.toString(),
      name,
      image,
      contentType: targetType,
    };
  });
}

// ---------- Get menus by location (with items) ----------
export async function getMenusByLocation(location: string) {
  try {
    await connection();
    const menus = await Menu.find({ location }).sort({ order: 1 }).lean();
    const enriched = await Promise.all(
      menus.map(async (menu) => {
        let items: any[] = [];
        if (menu.collectionId) {
          items = await resolveCollectionItems(menu.collectionId.toString());
        }
        return {
          ...menu,
          items, // attached for rendering
        };
      }),
    );
    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get single menu by ID ----------
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id).lean();
    if (!menu) return { success: false, error: "Menu not found" };

    let items: any[] = [];
    if (menu.collectionId) {
      items = await resolveCollectionItems(menu.collectionId.toString());
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify({ ...menu, items })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get all menus (without items, for listing) ----------
export async function getAllMenus() {
  try {
    await connection();
    // Populate collectionId to show collection names in the list
    const menus = await Menu.find()
      .populate("collectionId", "name")
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(menus)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Create a new menu ----------
export async function createMenu(menuData: any) {
  try {
    await connection();
    const newMenu = new Menu({
      name: menuData.name,
      description: menuData.description,
      image: menuData.image,
      collectionId: menuData.collectionId || undefined,
      link: menuData.link || undefined,
      location: menuData.location,
      display: menuData.display,
      position: menuData.position,
      columns: menuData.columns,
      maxDepth: menuData.maxDepth,
      showImages: menuData.showImages,
      backgroundColor: menuData.backgroundColor,
      backgroundImage: menuData.backgroundImage,
      isSticky: menuData.isSticky,
      sectionTitle: menuData.sectionTitle,
      order: menuData.order ?? 0,
    });
    await newMenu.save();
    revalidatePath("/marketing/content/navigation/menus");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(newMenu)),
      message: "Menu created successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Update an existing menu ----------
export async function updateMenu(id: string, menuData: any) {
  try {
    await connection();
    const updated = await Menu.findByIdAndUpdate(
      id,
      {
        $set: {
          name: menuData.name,
          description: menuData.description,
          image: menuData.image,
          collectionId: menuData.collectionId || undefined,
          link: menuData.link || undefined,
          location: menuData.location,
          display: menuData.display,
          position: menuData.position,
          columns: menuData.columns,
          maxDepth: menuData.maxDepth,
          showImages: menuData.showImages,
          backgroundColor: menuData.backgroundColor,
          backgroundImage: menuData.backgroundImage,
          isSticky: menuData.isSticky,
          sectionTitle: menuData.sectionTitle,
          order: menuData.order ?? 0,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return { success: false, error: "Menu not found" };
    revalidatePath("/marketing/content/navigation/menus");
    revalidatePath(`/marketing/content/navigation/menus/edit/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Delete a menu ----------
export async function deleteMenu(id: string) {
  try {
    await connection();
    const menu = await Menu.findByIdAndDelete(id);
    if (!menu) return { success: false, error: "Menu not found" };
    revalidatePath("/marketing/content/navigation/menus");
    return { success: true, message: "Menu deleted successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
