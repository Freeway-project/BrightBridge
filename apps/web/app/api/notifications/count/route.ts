import { NextResponse } from "next/server";
import { getNotificationCount } from "@/lib/notifications/queries";

// Live unread count — always fresh, never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const count = await getNotificationCount();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
