"use server"

import { Collection } from "@/models/Collection";
import { connection } from "@/utils/connection";

export async function getAllCollections() {
  try {
    await connection();
    const collections = await Collection.find().sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(collections)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
