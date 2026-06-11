import { getAuthContext } from "@/lib/auth/context";
import { recentLogs, subscribeLogs, type LogEntry } from "@/lib/observability/log-buffer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(entry: LogEntry): string {
  return `data: ${JSON.stringify(entry)}\n\n`;
}

export async function GET() {
  const context = await getAuthContext();
  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    return new Response("forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const entry of recentLogs(100)) {
        controller.enqueue(encoder.encode(sseLine(entry)));
      }
      unsubscribe = subscribeLogs((entry) => {
        try {
          controller.enqueue(encoder.encode(sseLine(entry)));
        } catch {
          // controller closed
        }
      });
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // ignore
        }
      }, 15_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
