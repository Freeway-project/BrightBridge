import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
import { getNotificationsPageData } from "@/lib/notifications/queries";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const { notifications } = await getNotificationsPageData();
  if (notifications.length === 0) return NextResponse.json({ ok: true, dismissed: 0 });

  const admin = getSupabaseAdminClientOrThrow();
  const rows = notifications.map((n) => ({
    user_id: ctx.profile.id,
    notification_id: n.id,
  }));

  const { error } = await admin
    .from("dismissed_notifications")
    .upsert(rows, { onConflict: "user_id,notification_id", ignoreDuplicates: true });
  if (error) {
    console.error("dismiss-all failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, dismissed: rows.length });
}
