// app/actions/getHistory.ts
"use server";

import { revalidatePath } from "next/cache";
import axios from "axios";
import { connection } from "@/utils/connection"; // Make sure this import exists
import UserEvent, { EventType } from "@/models/UserEvent"; // Make sure this import exists

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

// Configure axios with timeout
const apiClient = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

export async function fetchUserEvent(
  userId?: string,
  eventType: string = "view",
  limit: number = 20
) {
  // Input validation
  if (!userId || typeof userId !== "string") {
    console.error("Invalid user ID provided:", userId);
    return [];
  }

  if (limit < 1 || limit > 100) {
    limit = 20; // Enforce reasonable limits
  }

  const url = `${FASTAPI_URL}/history/${encodeURIComponent(
    userId
  )}?event_type=${encodeURIComponent(eventType)}&limit=${limit}`;

  try {
    const res = await apiClient.get(url);
    console.log("User event history response:", res.data);

    // Safely transform the response
    const events = res.data?.events || [];

    return events.map((event: any) => ({
      id: event.event_id || event._id || `event-${Date.now()}-${Math.random()}`,
      user_id: event.user_id || userId,
      product_id: event.product_id || "",
      event_type: event.event_type || eventType,
      timestamp: event.timestamp || new Date().toISOString(),
      product_details: event.product_details || {},
    }));
  } catch (error: any) {
    console.error("Error fetching user event history:", error);

    // Return more specific error information
    if (error.response) {
      console.error(
        "API Response Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error("Network Error:", error.request);
    }

    return [];
  }
}

export async function getRecommendations(userId: string, limit: number = 5) {
  // Input validation
  if (!userId || typeof userId !== "string") {
    console.error("Invalid user ID provided for recommendations:", userId);
    return [];
  }

  if (limit < 1 || limit > 20) {
    limit = 5; // Enforce API limits
  }

  const url = `${FASTAPI_URL}/recommend/${encodeURIComponent(
    userId
  )}?k=${limit}`;

  try {
    const res = await apiClient.get(url);
    console.log("Recommendations response:", res.data);

    return res.data?.recommendations || [];
  } catch (error: any) {
    console.error("Error fetching recommendations:", error);

    if (error.response) {
      console.error(
        "API Response Error:",
        error.response.status,
        error.response.data
      );
    }

    return [];
  }
}

export async function checkUserExists(userId: string) {
  if (!userId || typeof userId !== "string") {
    return false;
  }

  const url = `${FASTAPI_URL}/users/${encodeURIComponent(userId)}/exists`;

  try {
    const res = await apiClient.get(url);
    return res.data?.exists || false;
  } catch (error: any) {
    console.error("Error checking user existence:", error);

    // If the endpoint doesn't exist, assume user exists for fallback
    if (error.response?.status === 404) {
      return true; // Fallback: assume user exists
    }

    return false;
  }
}

export async function getProductDetails(productId: string) {
  if (!productId || typeof productId !== "string") {
    return null;
  }

  const url = `${FASTAPI_URL}/products/${encodeURIComponent(productId)}`;

  try {
    const res = await apiClient.get(url);
    return res.data?.details || null;
  } catch (error: any) {
    console.error("Error fetching product details:", error);

    if (error.response?.status === 404) {
      console.log("Product not found:", productId);
    }

    return null;
  }
}

// Enhanced server action with context
export async function createUserEvents(data: {
  userId: string;
  product_id: string;
  event_type: EventType;
  device?: string;
  location?: string;
  metadata?: any;
}) {
  console.log("Creating user event with context:", data);
  const { userId, product_id, event_type, device, location, metadata } = data;
  await connection();

  const newEvent = new UserEvent({
    user_id: userId,
    product_id,
    event_type,
    device: device || getDeviceType(),
    location: location || "", // You'd implement this
    metadata: {
      ...metadata,
      user_agent: typeof window !== "undefined" ? navigator.userAgent : "",
      page_url: typeof window !== "undefined" ? window.location.href : "",
      timestamp: new Date().toISOString(),
    },
  });

  await newEvent.save();
  return { success: true, eventId: newEvent._id };
}

// Enhanced recommendation function with context
export async function getContextualRecommendations(
  userId: string,
  device?: string,
  location?: string,
  limit: number = 5
) {
  if (!userId) return [];

  let url = `${FASTAPI_URL}/recommend/${userId}?k=${limit}`;
  if (device) url += `&device=${encodeURIComponent(device)}`;
  if (location) url += `&location=${encodeURIComponent(location)}`;

  try {
    const res = await axios.get(url);
    console.log({ res });

    return res.data.recommendations;
  } catch (error) {
    console.error("Error fetching contextual recommendations:", error);
    return [];
  }
}

// Helper function to detect device type
function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";

  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(userAgent)) return "mobile";
  if (/tablet|ipad/.test(userAgent)) return "tablet";
  return "desktop";
}

// Additional utility function to sync events with FastAPI backend
export async function syncUserEventsToAPI() {
  try {
    await connection();

    // Get recent unsynced events (you might want to add a 'synced' field to your schema)
    const unsyncedEvents = await UserEvent.find({
      synced: { $ne: true },
    }).limit(50);

    if (unsyncedEvents.length === 0) {
      return { success: true, synced: 0, message: "No events to sync" };
    }

    let syncedCount = 0;

    for (const event of unsyncedEvents) {
      try {
        // If your FastAPI backend has a POST endpoint for events, you can sync here
        // For now, we'll just mark as synced
        event.synced = true;
        await event.save();
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync event ${event._id}:`, error);
      }
    }

    return { success: true, synced: syncedCount, total: unsyncedEvents.length };
  } catch (error: any) {
    console.error("Error syncing user events:", error);
    return { success: false, error: error.message };
  }
}
