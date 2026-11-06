// app/actions/contact.ts
"use server";

import { connection } from "@/utils/connection";
import ContactMessage from "@/models/ContactMessage";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  userId?: string | null;
};

export async function submitContactMessage(
  payload: ContactPayload,
): Promise<{ success: boolean; error?: string }> {
  const ip = await getClientIp();
  const limit = await consumeRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return {
      success: false,
      error: "Too many messages from this connection. Please try again later.",
    };
  }

  await connection();

  try {
    const name = payload.name?.trim().slice(0, 120);
    const email = payload.email?.trim().toLowerCase().slice(0, 200);
    const subject = payload.subject?.trim().slice(0, 160);
    const message = payload.message?.trim().slice(0, 5000);

    if (!name || !email || !subject || !message) {
      return {
        success: false,
        error: "Please fill in all required fields.",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (message.length < 10) {
      return {
        success: false,
        error: "Your message should be at least 10 characters long.",
      };
    }

    await ContactMessage.create({
      name,
      email,
      phone: payload.phone?.trim() || undefined,
      subject,
      message,
      userId: payload.userId || null,
      status: "new",
    });

    return { success: true };
  } catch (error: any) {
    console.error("[submitContactMessage] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to send your message. Please try again.",
    };
  }
}
