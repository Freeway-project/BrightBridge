import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isReadonlyMode } from "@/lib/system-migration";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_METRIC_PREFIXES = ["/api/metrics", "/api/health"];

// Cookie set by lib/auth/service.ts after a successful Azure OIDC (or dev)
// sign-in. Middleware only checks presence — signature/expiry validation
// happens in the auth service on the server-side request path.
const OIDC_SESSION_COOKIE = "coursebridge_auth_session";

// Paths that must be reachable without a session: OIDC callback/login routes,
// maintenance + health/metrics/version endpoints, the marketing root, and the
// /login page itself.
const PUBLIC_PATH_PREFIXES = ["/auth/", "/api/version", "/api/metrics", "/api/health"];
const PUBLIC_EXACT_PATHS = new Set(["/", "/login", "/maintenance", "/auth"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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

  const hasSession = Boolean(request.cookies.get(OIDC_SESSION_COOKIE)?.value);
  if (!hasSession && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/auth/oidc/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/version|api/metrics|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
