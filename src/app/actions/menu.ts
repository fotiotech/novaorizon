// app/actions/menu.ts
"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { Collection } from "@/models/Collection";
import { buildQueryFromRules } from "./collection";

// ------------------------------------------------------------
// Interface (including order)
// ------------------------------------------------------------
export interface MenuData {
  name: string;
  description?: string;
  content: string[];
  ctaUrl?: string;
  ctaText?: string;
  type: string;
  location?: string;
  display?: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
  order?: number;
}

// ------------------------------------------------------------
// Helper: populate content (recursive, supports MegaMenu; does NOT expand Collections)
// ------------------------------------------------------------
async function populateContent(menu: any) {
  if (!menu || !menu.content || menu.content.length === 0) return menu;

  const type = menu.type;
  let model: any;
  let isMenuModel = false;

  switch (type) {
    case "Category":
      model = Category;
      break;
    case "Product":
      model = Product;
      break;
    case "Brand":
      model = Brand;
      break;
    case "Promotion":
      model = Promotion;
      break;
    case "Collection":
      model = Collection;
      break;
    case "MegaMenu":
      model = Menu;
      isMenuModel = true;
      break;
    default:
      // URL, Search, Page, etc. – no population
      return menu;
  }

  const docs = await model.find({ _id: { $in: menu.content } }).lean();

  // ---- MegaMenu: recursive children ----
  if (isMenuModel) {
    const populatedChildren = await Promise.all(
      docs.map(async (doc: any) => {
        const childMenu = { ...doc };
        return populateContent(childMenu);
      }),
    );
    menu.populatedContent = populatedChildren.map((child) => ({
      _id: child._id.toString(),
      name: child.name,
      fullData: child,
      contentType: "Menu",
    }));
    return menu;
  }

  // ---- All other types (Category, Product, Brand, Promotion, Collection) ----
  // For products, use "main_image"; for others, use "image" or "imageUrl".
  const imageField = type === "Product" ? "main_image" : "image";
  menu.populatedContent = docs.map((doc: any) => ({
    _id: doc._id.toString(),
    name: doc.name || doc.title || "Unnamed",
    image: doc[imageField] || doc.imageUrl || null,
    contentType: type, // "Category", "Product", "Brand", "Promotion", "Collection"
  }));

  return menu;
}

// ------------------------------------------------------------
// Get menus by location (sorted by order)
// ------------------------------------------------------------
export async function getMenusByLocation(location: string) {
  try {
    await connection();
    const menus = await Menu.find({ location }).sort({ order: 1 });
    const populatedMenus = await Promise.all(
      menus.map(async (menu) => populateContent(menu.toObject())),
    );
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------
// CRUD operations
// ------------------------------------------------------------
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id);
    if (!menu) return { success: false, error: "Menu not found" };
    const populatedMenu = await populateContent(menu.toObject());
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenu)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find().sort({ createdAt: -1 });
    const populatedMenus = await Promise.all(
      menus.map(async (menu) => populateContent(menu.toObject())),
    );
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMenusByType(type: string) {
  try {
    await connection();
    const menus = await Menu.find({ type }).sort({ createdAt: -1 });
    const populatedMenus = await Promise.all(
      menus.map(async (menu) => populateContent(menu.toObject())),
    );
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMenu(menuData: MenuData) {
  try {
    await connection();
    const contentIds = (menuData.content || []).map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    const newMenu = new Menu({
      ...menuData,
      content: contentIds,
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

export async function updateMenu(id: string, menuData: Partial<MenuData>) {
  try {
    await connection();
    const updateData: any = { ...menuData };
    if (menuData.content) {
      updateData.content = menuData.content.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }
    if (menuData.order !== undefined) {
      updateData.order = menuData.order;
    }
    const menu = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!menu) return { success: false, error: "Menu not found" };
    revalidatePath("/marketing/content/navigation/menus");
    revalidatePath(`/marketing/content/navigation/menus/edit/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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

// ------------------------------------------------------------
// Fetch content options for form selection
// ------------------------------------------------------------
export async function getMenuContentOptions(type: string) {
  await connection();
  let items: any[] = [];
  switch (type) {
    case "Category":
      items = await Category.find().select("_id name").lean();
      break;
    case "Product":
      items = await Product.find().select("_id title main_image").lean();
      break;
    case "Brand":
      items = await Brand.find().select("_id name").lean();
      break;
    case "Promotion":
      items = await Promotion.find().select("_id name").lean();
      break;
    case "Collection":
      items = await Collection.find().select("_id name").lean();
      break;
    default:
      return [];
  }
  return items.map((item) => ({
    value: item._id.toString(),
    label: item.name || item.title || "Unnamed",
  }));
}
