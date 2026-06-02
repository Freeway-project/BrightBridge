import { getDeploymentVersion } from "@/lib/deployment-version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const version = getDeploymentVersion();

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      controller.enqueue(enc.encode(`data: ${JSON.stringify({ version })}\n\n`));

      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 25_000);

      return () => clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
