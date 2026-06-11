import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { searchMessages } from "@/lib/chat/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireProfile();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const conversationId = url.searchParams.get("conversationId") ?? undefined;
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const hits = await searchMessages(ctx.userId, q, { conversationId, limit: 20 });
  return NextResponse.json({ hits });
}
