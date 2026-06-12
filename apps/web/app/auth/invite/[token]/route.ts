import { NextResponse, type NextRequest } from "next/server";
import {
  redeemReviewInvite,
  markInviteAccepted,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";

/**
 * Instructor entry from an admin-emailed link. This route:
 *
 *   1. Validates the one-time invite token and marks it consumed.
 *   2. Ensures the instructor profile row exists so PBAC can match them.
 *   3. Records the dashboard-open signal (drives the indicator dot).
 *   4. Auto-advances the course to "instructor_viewing" if applicable.
 *   5. Redirects to /auth/login with `next=` set to the course page.
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

  const nextPath = `/instructor/courses/${invite.courseId}`;
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", nextPath);

  try {
    const instructorProfileId = await ensureInstructorIdentity(invite.email);

    await markInviteAccepted(invite.id);

    const { recordInstructorView } = await import("@/lib/instructor-views/service");
    await recordInstructorView(invite.courseId, instructorProfileId);

    try {
      const { markInstructorViewingByLink } = await import("@/lib/courses/service");
      await markInstructorViewingByLink({ courseId: invite.courseId, instructorProfileId });
    } catch (statusError) {
      console.error("[auth/invite] Failed to mark instructor viewing:", statusError);
    }
  } catch (error) {
    console.error("[auth/invite] Bookkeeping failed; continuing to login redirect:", error);
  }

  return NextResponse.redirect(loginUrl);
}
