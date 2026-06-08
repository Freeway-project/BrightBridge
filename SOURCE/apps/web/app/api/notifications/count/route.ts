import { NextResponse } from "next/server";
import { getNotificationsPageData } from "@/lib/notifications/queries";

export async function GET() {
  try {
    const { pendingCount } = await getNotificationsPageData();
    return NextResponse.json({ count: pendingCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
