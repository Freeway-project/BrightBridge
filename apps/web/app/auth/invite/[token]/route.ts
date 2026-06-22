import { NextResponse, type NextRequest } from "next/server";
import {
  redeemReviewInvite,
  markInviteAccepted,
  recordInviteAccess,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";
import { mintSession } from "@/lib/auth/service";

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

    await mintSession({
      sub: instructorProfileId,
      email: invite.email,
      fullName: null,
    });

    // Never-expiring batch links track access counts; one-time links record first-open.
    if (invite.expiresAt === null) {
      await recordInviteAccess(invite.id);
    } else if (!invite.acceptedAt) {
      await markInviteAccepted(invite.id);
    }

    // Admin preview links must not affect course state or instructor view counts —
    // only the real instructor opening their own link should trigger those side effects.
    if (!invite.isAdminPreview) {
      const { recordInstructorView } = await import("@/lib/instructor-views/service");
      await recordInstructorView(invite.courseId, instructorProfileId);

      try {
        const { markInstructorViewingByLink } = await import("@/lib/courses/service");
        await markInstructorViewingByLink({ courseId: invite.courseId, instructorProfileId });
      } catch (statusError) {
        console.error("[auth/invite] Failed to mark instructor viewing:", statusError);
      }
    }
  } catch (error) {
    console.error("[auth/invite] Session/bookkeeping failed:", error);
  }

  return NextResponse.redirect(courseUrl);
}
