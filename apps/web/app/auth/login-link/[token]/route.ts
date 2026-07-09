import { NextResponse, type NextRequest } from "next/server";
import { redeemLoginLink, recordLoginLinkAccess } from "@/lib/login-links/service";
import { getProfileRepository } from "@/lib/repositories";
import { mintSession } from "@/lib/auth/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  // Reuse the existing invite "expired/invalid" page for any failure path.
  const invalidUrl = new URL("/auth/invite/expired", request.url);

  let link;
  try {
    const result = await redeemLoginLink(token);
    if (!result.ok) {
      return NextResponse.redirect(invalidUrl);
    }
    link = result.link;
  } catch (error) {
    console.error("[auth/login-link] Failed to redeem link:", error);
    return NextResponse.redirect(invalidUrl);
  }

  try {
    const profile = await getProfileRepository().getProfileById(link.profileId);
    // Defense in depth: the target must still exist and must not be a super_admin
    // (the role could have changed to super_admin after the link was minted).
    if (!profile || profile.role === "super_admin") {
      return NextResponse.redirect(invalidUrl);
    }

    await mintSession({
      sub: profile.id,
      email: profile.email,
      fullName: profile.fullName,
    });

    await recordLoginLinkAccess(link.id);
  } catch (error) {
    console.error("[auth/login-link] Session/bookkeeping failed:", error);
    return NextResponse.redirect(invalidUrl);
  }

  // /dashboard routes to the right home for the user's role.
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
