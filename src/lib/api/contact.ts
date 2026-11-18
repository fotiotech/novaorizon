import api from "@/lib/api";

/** Contact form — `POST /api/contact` (rate-limited server-side). */

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  userId?: string | null;
}

export async function submitContactMessage(
  payload: ContactPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    const name = payload.name?.trim().slice(0, 120);
    const email = payload.email?.trim().toLowerCase().slice(0, 200);
    const subject = payload.subject?.trim().slice(0, 160);
    const message = payload.message?.trim().slice(0, 5000);

    if (!name || !email || !subject || !message) {
      return { success: false, error: "Please fill in all required fields." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (message.length < 10) {
      return {
        success: false,
        error: "Your message should be at least 10 characters long.",
      };
    }

    await api.post("/contact", {
      name,
      email,
      phone: payload.phone?.trim() || undefined,
      subject,
      message,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[submitContactMessage] Error:", error);
    return {
      success: false,
      error:
        error?.response?.data?.error ??
        error?.message ??
        "Unable to send your message. Please try again.",
    };
  }
}
