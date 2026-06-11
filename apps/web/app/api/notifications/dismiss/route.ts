import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });

  const pool = getPostgresPool();
  const { rowCount } = await pool.query(
    `INSERT INTO dismissed_notifications (user_id, notification_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, notification_id) DO NOTHING`,
    [ctx.profile.id, parsed.data.id],
  ).catch((err) => {
    console.error("dismiss failed", err);
    return { rowCount: -1 };
  });

  if (rowCount === -1) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
