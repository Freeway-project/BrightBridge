import { NextResponse, type NextRequest } from "next/server";
import {
  redeemReviewInvite,
  markInviteAccepted,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";
import { mintSession } from "@/lib/auth/service";

/**
 * Instructor entry from an emailed link. Instructors have no password — the
 * link IS their authentication. This route:
 *
 *   1. Validates the invite token (revoked / expired checks; NOT one-time-use).
 *   2. Ensures the instructor profile row exists (idempotent upsert).
 *   3. Mints a session cookie — instructor is logged in immediately.
 *   4. Records the dashboard-open signal (drives the indicator dot).
 *   5. Auto-advances the course to "instructor_viewing" if applicable.
 *   6. Redirects directly to the course review page (no login page shown).
 *
 * The link can be clicked multiple times — useful if the instructor bookmarks
 * it or opens it on a new device. Only admin revocation stops it.
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

  const courseUrl = new URL(`/instructor/courses/${invite.courseId}`, request.url);

  try {
    const instructorProfileId = await ensureInstructorIdentity(invite.email);

    // Mint a session — instructor is now logged in, no password needed.
    await mintSession({
      sub: instructorProfileId,
      email: invite.email,
      fullName: null,
    });

    // Record first-open on the invite row (informational only, does not block reuse).
    if (!invite.acceptedAt) {
      await markInviteAccepted(invite.id);
    }

    const { recordInstructorView } = await import("@/lib/instructor-views/service");
    await recordInstructorView(invite.courseId, instructorProfileId);

    try {
      const { markInstructorViewingByLink } = await import("@/lib/courses/service");
      await markInstructorViewingByLink({ courseId: invite.courseId, instructorProfileId });
    } catch (statusError) {
      console.error("[auth/invite] Failed to mark instructor viewing:", statusError);
    }
  } catch (error) {
    console.error("[auth/invite] Session/bookkeeping failed:", error);
    // Still redirect — worst case they land on the course page and see a login prompt.
  }

  return NextResponse.redirect(courseUrl);
}
