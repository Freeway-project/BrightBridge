import { NextResponse, type NextRequest } from "next/server";
import { getAuthService } from "@/lib/auth/service";
import {
  redeemReviewInvite,
  markInviteAccepted,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";

/**
 * Passwordless instructor access. An admin-generated email link points here;
 * we validate the one-time invite token, ensure the instructor identity exists,
 * mint a session, and drop them onto their dashboard. The clicker is not yet
 * authenticated, so invite lookup runs via the service-role client.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const expiredUrl = new URL("/auth/invite/expired", request.url);

  let invite;
  try {
    const result = await redeemReviewInvite(token);
    if (!result.ok) {
      return NextResponse.redirect(expiredUrl);
    }
    invite = result.invite;
  } catch (error) {
    console.error("[auth/invite] Failed to redeem invite:", error);
    return NextResponse.redirect(expiredUrl);
  }

  try {
    const auth = getAuthService();
    await ensureInstructorIdentity(invite.email);

    const hashedToken = await auth.generateMagicLinkHashedToken(invite.email);
    const { error } = await auth.verifyMagicLink(hashedToken);
    if (error) {
      console.error("[auth/invite] Failed to verify magic link:", error);
      return NextResponse.redirect(expiredUrl);
    }

    await markInviteAccepted(invite.id);
  } catch (error) {
    console.error("[auth/invite] Failed to establish instructor session:", error);
    return NextResponse.redirect(expiredUrl);
  }

  return NextResponse.redirect(new URL("/instructor", request.url));
}
