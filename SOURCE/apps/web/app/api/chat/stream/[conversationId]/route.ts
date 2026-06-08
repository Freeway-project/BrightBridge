import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";
import { events } from "@/lib/chat/events";

export const runtime = "nodejs";          // Edge can't use EventEmitter
export const dynamic = "force-dynamic";   // no caching

const encoder = new TextEncoder();

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

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch {
          unsubscribe?.();
          heartbeat && clearInterval(heartbeat);
          try { controller.close(); } catch {}
        }
      };

      send("ready", { conversationId, ts: Date.now() });

      unsubscribe = events.subscribe(conversationId, (e) => send(e.type, e.payload));

      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); }
        catch {
          unsubscribe?.();
          heartbeat && clearInterval(heartbeat);
          try { controller.close(); } catch {}
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
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
