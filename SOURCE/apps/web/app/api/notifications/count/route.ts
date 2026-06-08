import { NextResponse } from "next/server";
import { getNotificationsPageData } from "@/lib/notifications/queries";

// Live unread count — always fresh, never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { pendingCount } = await getNotificationsPageData();
    return NextResponse.json({ count: pendingCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
