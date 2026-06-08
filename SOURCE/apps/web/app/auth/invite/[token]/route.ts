import { NextResponse, type NextRequest } from "next/server";
import {
  redeemReviewInvite,
  markInviteAccepted,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";

/**
 * Instructor entry from an admin-emailed link. We no longer mint sessions
 * here — instructors authenticate via Azure OIDC (typically as Entra B2B
 * guests). This route only:
 *
 *   1. Validates the one-time invite token and marks it consumed.
 *   2. Ensures the instructor profile row exists so PBAC has something to
 *      match the OIDC subject against on first sign-in.
 *   3. Records the dashboard-open signal (drives the indicator dot).
 *   4. Auto-advances the course to "instructor_viewing" if applicable.
 *   5. Redirects to /auth/oidc/login with `next=` set to the course page,
 *      so Entra hand-back lands the instructor on the right URL.
 *
 * If the clicker already has an OIDC session, the OIDC route short-circuits
 * to `next` immediately.
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
  const oidcUrl = new URL("/auth/oidc/login", request.url);
  oidcUrl.searchParams.set("next", nextPath);

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
    // Bookkeeping failure is non-fatal — the instructor still needs to sign
    // in via OIDC. Log and continue to the redirect so they can complete auth.
    console.error("[auth/invite] Bookkeeping failed; continuing to OIDC redirect:", error);
  }

  return NextResponse.redirect(oidcUrl);
}
