// app/actions/newsletter.ts
"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";
import User from "@/models/User";
import { EMAIL_REGEX } from "@/app/lib/definitions";

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

/* -------------------- Public: Subscribe -------------------- */

export async function subscribeToNewsletter(payload: {
  email: string;
  source?: string;
  userId?: string | null;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  await connection();

  try {
    const email = payload.email?.trim().toLowerCase();

    if (!email) {
      return { success: false, error: "Please enter your email address." };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const existing = await NewsletterSubscriber.findOne({ email });

    if (existing) {
      if (existing.status === "subscribed") {
        // Still backfill userId if we now know who they are.
        if (!existing.userId && payload.userId) {
          existing.userId = payload.userId as any;
          await existing.save();
        }
        return {
          success: true,
          message: "You're already subscribed. Thanks for being with us!",
        };
      }
      // Re-subscribe a previously unsubscribed/bounced email
      existing.status = "subscribed";
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = null;
      if (!existing.unsubscribeToken) {
        existing.unsubscribeToken = makeToken();
      }
      if (!existing.userId && payload.userId) {
        existing.userId = payload.userId as any;
      }
      await existing.save();
      return {
        success: true,
        message: "Welcome back! You're subscribed again.",
      };
    }

    // No subscriber row yet — try to link to an existing user by email.
    let userId = payload.userId ?? null;
    if (!userId) {
      const user: any = await User.findOne({ email }).select("_id").lean();
      if (user) userId = String(user._id);
    }

    await NewsletterSubscriber.create({
      email,
      source: payload.source || "footer",
      userId: userId || null,
      unsubscribeToken: makeToken(),
      status: "subscribed",
      subscribedAt: new Date(),
    });

    return {
      success: true,
      message: "Thanks for subscribing! Check your inbox for updates.",
    };
  } catch (error: any) {
    console.error("[subscribeToNewsletter] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to subscribe. Please try again.",
    };
  }
}

/* -------------------- Public: Unsubscribe -------------------- */

export async function unsubscribeFromNewsletter(
  token: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  await connection();

  try {
    if (!token) {
      return { success: false, error: "Missing unsubscribe token." };
    }

    const sub = await NewsletterSubscriber.findOne({ unsubscribeToken: token });
    if (!sub) {
      return { success: false, error: "Invalid or expired unsubscribe link." };
    }
    if (sub.status === "unsubscribed") {
      return { success: true, message: "You're already unsubscribed." };
    }

    sub.status = "unsubscribed";
    sub.unsubscribedAt = new Date();
    await sub.save();

    // ── Reverse sync: keep the user's marketing preference aligned ──
    if (sub.userId) {
      try {
        await User.updateOne(
          { _id: sub.userId },
          { $set: { "preferences.marketing.email": false } },
        );
      } catch (err) {
        console.error("[unsubscribeFromNewsletter] user sync failed:", err);
      }
    }

    return { success: true, message: "You've been unsubscribed." };
  } catch (error: any) {
    console.error("[unsubscribeFromNewsletter] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to unsubscribe.",
    };
  }
}

/* -------------------- Admin: List -------------------- */

export async function getNewsletterSubscribers(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  subscribers: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: Record<string, number>;
}> {
  await connection();

  const { status, search, page = 1, limit = 20 } = options || {};
  const query: any = {};

  if (status && status !== "all") query.status = status;
  if (search) query.email = new RegExp(search, "i");

  const skip = (page - 1) * limit;

  const [subscribers, total, subscribed, unsubscribed, bounced] =
    await Promise.all([
      NewsletterSubscriber.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NewsletterSubscriber.countDocuments(query),
      NewsletterSubscriber.countDocuments({ status: "subscribed" }),
      NewsletterSubscriber.countDocuments({ status: "unsubscribed" }),
      NewsletterSubscriber.countDocuments({ status: "bounced" }),
    ]);

  return {
    subscribers: subscribers.map((s) => ({
      ...s,
      _id: s._id.toString(),
      createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
      subscribedAt: s.subscribedAt?.toISOString?.() ?? s.subscribedAt,
      unsubscribedAt:
        s.unsubscribedAt?.toISOString?.() ?? s.unsubscribedAt ?? null,
    })),
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    counts: {
      all: subscribed + unsubscribed + bounced,
      subscribed,
      unsubscribed,
      bounced,
    },
  };
}

/* -------------------- Admin: Delete -------------------- */

export async function deleteNewsletterSubscriber(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid id." };
  }
  try {
    await NewsletterSubscriber.findByIdAndDelete(id);
    revalidatePath("/admin/newsletter");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteNewsletterSubscriber] Error:", error);
    return { success: false, error: error.message };
  }
}

/* -------------------- Admin: Export CSV -------------------- */

export async function exportNewsletterCsv(): Promise<{
  success: boolean;
  csv?: string;
  error?: string;
}> {
  await connection();
  try {
    const subs = await NewsletterSubscriber.find({ status: "subscribed" })
      .sort({ subscribedAt: -1 })
      .lean();

    const rows = [
      ["email", "status", "source", "subscribedAt"],
      ...subs.map((s) => [
        s.email,
        s.status,
        s.source || "",
        s.subscribedAt ? new Date(s.subscribedAt).toISOString() : "",
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return { success: true, csv };
  } catch (error: any) {
    console.error("[exportNewsletterCsv] Error:", error);
    return { success: false, error: error.message };
  }
}
