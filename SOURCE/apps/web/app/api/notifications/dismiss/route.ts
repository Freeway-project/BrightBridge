import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });

  const admin = getSupabaseAdminClientOrThrow();
  const { error } = await admin
    .from("dismissed_notifications")
    .upsert(
      { user_id: ctx.profile.id, notification_id: parsed.data.id },
      { onConflict: "user_id,notification_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("dismiss failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
