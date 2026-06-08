import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { OIDC_NEXT_COOKIE, getAuthService } from "@/lib/auth/service";

function getPublicBaseUrl(request: NextRequest): URL {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    return new URL(appBaseUrl);
  }
  return new URL(request.url);
}

function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (code) {
    await getAuthService().exchangeCodeForSession(code, state);
  }

  // Prefer the OIDC-flow next cookie (set by /auth/oidc/login). Fall back to
  // the query string for callers that pass ?next= directly.
  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(OIDC_NEXT_COOKIE)?.value;
  const queryNext = requestUrl.searchParams.get("next");
  const target = safeNext(cookieNext ?? queryNext);

  cookieStore.delete(OIDC_NEXT_COOKIE);

  const baseUrl = getPublicBaseUrl(request);
  return NextResponse.redirect(new URL(target, baseUrl));
}
