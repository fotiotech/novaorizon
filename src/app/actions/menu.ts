// app/actions/menu.ts
"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import "@/models/Collection";

// Define the Menu interface
export interface MenuData {
  name: string;
  description?: string;
  collections: string[];
  ctaUrl?: string;
  ctaText?: string;
}

// Get menu by ID
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id).populate("collections");

    if (!menu) {
      return { success: false, error: "Menu not found" };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all menus
export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find()
      .populate("collections")
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all menus with their collections populated
export async function getAllMenuWithCollections() {
  try {
    await connection();

    // Fetch menus with populated collections
    const menus = await Menu.find()
      .populate("collections")
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
