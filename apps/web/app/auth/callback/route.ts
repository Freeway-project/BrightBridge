import { NextResponse, type NextRequest } from "next/server";
import { getAuthService } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    await getAuthService().exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
