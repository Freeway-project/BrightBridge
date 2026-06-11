import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";
import { assertMember } from "@/lib/chat/membership";
import { getPresignedGetUrl } from "@coursebridge/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const authCtx = await requireProfile();
  const { rows } = await getPostgresPool().query<{ storage_key: string; conversation_id: string }>(
    `select a.storage_key, m.conversation_id
     from public.message_attachments a
     join public.messages m on m.id = a.message_id
     where a.id = $1`,
    [id],
  );
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  await assertMember(rows[0].conversation_id, authCtx.userId);
  const url = await getPresignedGetUrl(rows[0].storage_key, 120);
  return NextResponse.json({ url });
}
