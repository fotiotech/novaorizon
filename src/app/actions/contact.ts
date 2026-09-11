// app/actions/contact.ts
"use server";

import { connection } from "@/utils/connection";
import ContactMessage from "@/models/ContactMessage";

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
  await connection();

  try {
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const subject = payload.subject?.trim();
    const message = payload.message?.trim();

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
