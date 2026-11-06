import Notification from "@/models/Notification";
import User from "@/models/User";
import { NextResponse } from "next/server";
import Pusher from "pusher";
import { requireAdmin } from "@/lib/authz";
import { connection } from "@/utils/connection";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID as string,
  key: process.env.PUSHER_APP_KEY as string,
  secret: process.env.PUSHER_APP_SECRET as string,
  cluster: process.env.PUSHER_APP_CLUSTER as string,
  useTLS: true,
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    await connection();
    const PAGE_SIZE = 10; // Limit to avoid overloading
    const notifications = await Notification.find({ userId: admin.id })
      .sort({ timestamp: -1 })
      .limit(PAGE_SIZE);

    const userIds = notifications.map((notification) => notification.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email image role")
      .lean();
    const userMap = Object.fromEntries(
      users.map((user: any) => [user._id.toString(), user])
    );

    const notificationsWithUsers = notifications.map((notification) => ({
      ...notification.toObject(),
      user: userMap[notification.userId.toString()],
    }));

    return NextResponse.json(notificationsWithUsers);
  } catch (error: any) {
    const status =
      error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json(
      { error: status === 500 ? "Failed to fetch data." : error.message },
      { status },
    );
  }
}

// Admin-only write endpoint. Storefront actions create admin
// notifications through notifyAdmins() in app/actions/notifications.ts.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    await connection();
    const { userId, message } = await request.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const notification = new Notification({ userId, message });
    await notification.save();

    await pusher.trigger("admin-notifications", "new-notification", {
      id: notification._id.toString(),
      message,
    });

    return NextResponse.json({ status: "Notification sent" });
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json({ error: "Not authorized" }, { status });
  }
}
