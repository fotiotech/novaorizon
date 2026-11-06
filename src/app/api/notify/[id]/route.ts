// /app/api/notifications/[id]/route.ts

import Notification from "@/models/Notification";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { connection } from "@/utils/connection";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const params = await props.params;
  const { id } = params;
  await connection();
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: admin.id },
    { isRead: true },
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "Notification marked as read" });
}
