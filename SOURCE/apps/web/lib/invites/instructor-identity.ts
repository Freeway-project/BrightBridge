import "server-only";

import { randomUUID } from "node:crypto";
import { getProfileRepository } from "@/lib/repositories";

/**
 * Idempotently ensures an instructor profile row exists for an email. Called
 * by the invite-redemption route before kicking off OIDC sign-in so PBAC has
 * a profile to match the Entra subject against on first sign-in.
 *
 * No auth user is provisioned here — Entra (B2B guest or otherwise) is the
 * authoritative auth backend. The profile id we assign is replaced on first
 * sign-in by auth/context, which resolves the OIDC sub → profile by email.
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
