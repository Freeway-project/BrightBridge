import "server-only";

import { recordView } from "./repository";

/**
 * Fire-and-forget record of an instructor opening a course dashboard. Never
 * throws — a logging failure must not block the instructor from viewing their
 * course or break a magic-link redemption flow. Failures are surfaced to
 * server logs only.
 */
export async function recordInstructorView(
  courseId: string,
  profileId: string,
): Promise<void> {
  try {
    await recordView({ courseId, profileId });
  } catch (error) {
    console.error("[instructor-views] Failed to record view:", error);
  }
}
