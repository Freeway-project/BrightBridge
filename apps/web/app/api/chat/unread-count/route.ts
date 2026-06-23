import { NextResponse } from "next/server"
import { requireProfile } from "@/lib/auth/context"
import { getPostgresPool } from "@/lib/postgres/pool"

export async function GET() {
  let userId: string
  try {
    const ctx = await requireProfile()
    userId = ctx.userId
  } catch {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }

  const { rows } = await getPostgresPool().query(
    `SELECT COUNT(*)::int AS n
     FROM public.messages m
     JOIN public.conversation_members cm
       ON cm.conversation_id = m.conversation_id
       AND cm.user_id = $1
       AND cm.removed_at IS NULL
     WHERE m.deleted_at IS NULL
       AND m.parent_id IS NULL
       AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)`,
    [userId],
  )

  return NextResponse.json({ count: rows[0]?.n ?? 0 })
}
