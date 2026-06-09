import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isReadonlyMode } from "@/lib/system-migration";
import { updateSession } from "@/lib/supabase/middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_METRIC_PREFIXES = ["/api/metrics", "/api/health"];

function sanitizeRoute(pathname: string): string {
  const stripped = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const segments = stripped.split("/").slice(1, 5).map((seg) => {
    if (!seg) return seg;
    if (UUID_RE.test(seg)) return ":id";
    if (/^\d+$/.test(seg)) return ":id";
    return seg;
  });
  return "/" + segments.join("/");
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (isReadonlyMode(request.headers.get("host")) && request.nextUrl.pathname !== "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const skip = SKIP_METRIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const start = process.hrtime.bigint();

  const response = await handle(request);

  if (!skip) {
    try {
      const { observeHttp } = await import("@/lib/observability/metrics");
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      observeHttp(
        request.method,
        sanitizeRoute(pathname),
        response.status,
        durationSeconds,
      );
    } catch {
      // Metrics must never break a request.
    }
  }

  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/version|api/metrics|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
