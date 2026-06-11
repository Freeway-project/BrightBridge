import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** How long a generated invite link stays valid. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ReviewInvite = {
  id: string;
  courseId: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};

export type InstructorRecipient = {
  profileId: string;
  email: string;
  fullName: string | null;
};

export type RedeemResult =
  | { ok: true; invite: ReviewInvite }
  | { ok: false; reason: "not_found" | "revoked" | "accepted" | "expired" };

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function requireAdmin() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — cannot manage review invites.");
  }
  return admin;
}

function mapInvite(row: {
  id: string;
  course_id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}): ReviewInvite {
  return {
    id: row.id,
    courseId: row.course_id,
    email: row.email,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Returns the instructors assigned to a course (with email) so we know who to
 * invite. Uses the service-role client because invites are generated in admin
 * contexts and we need the joined profile email regardless of RLS.
 */
export async function getCourseInstructorRecipients(courseId: string): Promise<InstructorRecipient[]> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("course_assignments")
    .select("profile_id, profiles!inner(email, full_name)")
    .eq("course_id", courseId)
    .eq("role", "instructor");

  if (error) {
    throw new Error(`Failed to load instructor assignments: ${error.message}`);
  }

  return (data ?? []).flatMap((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.email) return [];
    return [{ profileId: row.profile_id, email: profile.email, fullName: profile.full_name ?? null }];
  });
}

/**
 * Creates a one-time, time-limited invite for an instructor to access a course.
 * Any prior un-accepted invite for the same (course, email) is revoked first so
 * only the newest link works. Returns the RAW token — the only time it exists in
 * plaintext; the database stores only its SHA-256 hash.
 */
export async function createReviewInvite(input: {
  courseId: string;
  email: string;
  createdBy: string;
}): Promise<{ token: string; invite: ReviewInvite }> {
  const admin = requireAdmin();
  const email = input.email.trim().toLowerCase();

  // Invalidate older outstanding links for this course+email.
  await admin
    .from("review_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("course_id", input.courseId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = await admin
    .from("review_invites")
    .insert({
      course_id: input.courseId,
      email,
      token_hash: hashToken(token),
      created_by: input.createdBy,
      expires_at: expiresAt,
    })
    .select("id, course_id, email, expires_at, accepted_at, revoked_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create review invite: ${error?.message ?? "no row returned"}`);
  }

  return { token, invite: mapInvite(data) };
}

/**
 * Validates a raw invite token. Does NOT mutate state — call markInviteAccepted
 * only after the session has been minted successfully.
 */
export async function redeemReviewInvite(rawToken: string): Promise<RedeemResult> {
  const admin = requireAdmin();

  const { data, error } = await admin
    .from("review_invites")
    .select("id, course_id, email, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up review invite: ${error.message}`);
  }
  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  if (data.accepted_at) return { ok: false, reason: "accepted" };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, invite: mapInvite(data) };
}

/** Marks an invite consumed so the link cannot be reused. */
export async function markInviteAccepted(inviteId: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin
    .from("review_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    throw new Error(`Failed to mark invite accepted: ${error.message}`);
  }
}
