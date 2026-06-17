import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

// Fallback SSE endpoint for single-instance deployments without Supabase.
// When NEXT_PUBLIC_SUPABASE_URL is set, ChatSseClient uses Supabase Broadcast
// instead and this route is never called. Without Supabase the client falls
// back here; we keep the connection alive with pings so the tab doesn't error,
// but real-time message delivery requires Supabase Broadcast to be configured.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await ctx.params;
  const authCtx = await requireProfile();

  try {
    await assertMember(conversationId, authCtx.userId);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ conversationId, ts: Date.now() })}\n\n`));
      } catch { return; }

      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); }
        catch {
          heartbeat && clearInterval(heartbeat);
          try { controller.close(); } catch {}
        }
      }, 25_000);
    },
    cancel() {
      heartbeat && clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
