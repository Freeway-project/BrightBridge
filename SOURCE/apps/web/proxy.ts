import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isReadonlyMode } from "@/lib/system-migration";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (isReadonlyMode(request.headers.get("host")) && request.nextUrl.pathname !== "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/version|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
