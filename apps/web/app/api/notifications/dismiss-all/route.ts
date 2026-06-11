import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";
import { getNotificationsPageData } from "@/lib/notifications/queries";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const { notifications } = await getNotificationsPageData();
  if (notifications.length === 0) return NextResponse.json({ ok: true, dismissed: 0 });

  const pool = getPostgresPool();
  const userId = ctx.profile.id;

  const placeholders = notifications
    .map((_, i) => `($1, $${i + 2})`)
    .join(", ");
  const values = [userId, ...notifications.map((n) => n.id)];

  const { rowCount } = await pool.query(
    `INSERT INTO dismissed_notifications (user_id, notification_id)
     VALUES ${placeholders}
     ON CONFLICT (user_id, notification_id) DO NOTHING`,
    values,
  ).catch((err) => {
    console.error("dismiss-all failed", err);
    return { rowCount: -1 };
  });

  if (rowCount === -1) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, dismissed: notifications.length });
}
