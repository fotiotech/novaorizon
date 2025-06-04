// app/actions/getHistory.ts
"use server";

import { revalidatePath } from "next/cache";
import axios from "axios";
import { connection } from "@/utils/connection";
import UserEvent from "@/models/UserEvent";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function fetchUserEvent(
  userId?: string,
  eventType: string = "view", // Default to "view"
  limit: number = 20 // Default limit
) {
  if (!userId) return [];
  const url = `${FASTAPI_URL}/history/${userId}?event_type=${encodeURIComponent(
    eventType
  )}&limit=${limit}`;

  try {
    const res = await axios.get(url);
    console.log("User event history response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error fetching user event history:", error);
    return [];
  }
}

export async function createUserEvents(data: any) {
  console.log("Creating user event:", data);
  const { userId, product_id, event_type, metadata } = data;
  await connection();

  const newEvent = new UserEvent({
    user_id: userId,
    product_id,
    event_type,
    metadata,
  });
  await newEvent.save();
}
