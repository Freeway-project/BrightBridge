import { watch, type FSWatcher } from "node:fs";
import {
  getDeploymentVersion,
  getVersionFilePath,
  readVersionFile,
} from "@/lib/deployment-version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const initial = getDeploymentVersion();

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      let lastSent = initial;
      let closed = false;
      let debounce: ReturnType<typeof setTimeout> | null = null;
      let watcher: FSWatcher | null = null;
      let ping: ReturnType<typeof setInterval> | null = null;

      function cleanup() {
        if (closed) return;
        closed = true;
        if (ping) clearInterval(ping);
        if (debounce) clearTimeout(debounce);
        if (watcher) watcher.close();
      }

      const send = (version: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ version })}\n\n`));
        } catch {
          cleanup();
        }
      };

      // Emit the current version immediately on connect.
      send(initial);

      // Live push: watch the deploy marker file and emit the moment it changes.
      // fs.watch can fire twice per write, so debounce and dedupe against the
      // last value sent on this connection.
      try {
        watcher = watch(getVersionFilePath(), () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            const fresh = readVersionFile();
            if (fresh && fresh !== lastSent) {
              lastSent = fresh;
              send(fresh);
            }
          }, 200);
        });
        // A missing/rotated marker file must not kill the stream.
        watcher.on("error", () => {});
      } catch {
        // Marker file may not exist yet (first boot / dev) — the ping keepalive
        // and the client's polling/SSE-drop fallbacks still cover detection.
      }

      ping = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 25_000);

      return cleanup;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // We sit behind nginx (proxy_buffering defaults to on), which would buffer
      // this SSE stream and delay deploy detection. This header tells nginx to
      // stream it straight through — no nginx config change needed.
      "X-Accel-Buffering": "no",
    },
  });
}
