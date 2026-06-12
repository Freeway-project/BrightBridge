import "server-only";

import { randomUUID } from "node:crypto";
import { getProfileRepository } from "@/lib/repositories";

/**
 * Idempotently ensures an instructor profile row exists for an email. Called
 * by the invite-redemption route so PBAC has a profile to match when the
 * instructor signs in for the first time.
 */
export async function ensureInstructorIdentity(
  email: string,
  fullName?: string | null,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const profiles = getProfileRepository();

  const existing = await profiles.getProfileByEmail(normalized);
  const userId = existing?.id ?? randomUUID();

  await profiles.upsertProfile({
    id: userId,
    email: normalized,
    fullName: existing?.fullName ?? fullName ?? null,
    role: "instructor",
  });

  return userId;
}
