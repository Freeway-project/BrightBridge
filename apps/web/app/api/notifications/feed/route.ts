import { NextResponse } from "next/server";
import { getNotificationsPageData } from "@/lib/notifications/queries";

export async function GET() {
  try {
    const { notifications, pendingCount } = await getNotificationsPageData();
    return NextResponse.json({ notifications, pendingCount });
  } catch {
    return NextResponse.json({ notifications: [], pendingCount: 0 });
  }
}
