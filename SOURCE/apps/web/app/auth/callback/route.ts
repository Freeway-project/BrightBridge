import { NextResponse, type NextRequest } from "next/server";
import { getAuthService } from "@/lib/auth/service";

function getPublicBaseUrl(request: NextRequest): URL {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    return new URL(appBaseUrl);
  }
  return new URL(request.url);
}

function normalizeNextPath(next: string): string {
  if (!next.startsWith("/")) {
    return "/dashboard";
  }

  if (next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    await getAuthService().exchangeCodeForSession(code, state);
  }

  const baseUrl = getPublicBaseUrl(request);
  const safePath = normalizeNextPath(next);
  return NextResponse.redirect(new URL(safePath, baseUrl));
}
