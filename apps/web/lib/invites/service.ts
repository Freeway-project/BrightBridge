import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getPostgresPool } from "@/lib/postgres/pool";

// Instructor links are permanent access tokens — instructors have no password
// and use the link as their only way in. 1-year TTL; admin can revoke manually.
const INVITE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

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
  | { ok: false; reason: "not_found" | "revoked" | "expired" };

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
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
 * invite. Joins course_assignments to profiles and filters to instructor role.
 */
export async function getCourseInstructorRecipients(courseId: string): Promise<InstructorRecipient[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    profile_id: string;
    email: string | null;
    full_name: string | null;
  }>(
    `SELECT ca.profile_id, p.email, p.full_name
     FROM course_assignments ca
     INNER JOIN profiles p ON p.id = ca.profile_id
     WHERE ca.course_id = $1 AND ca.role = 'instructor'`,
    [courseId],
  );

  return rows.flatMap((row) => {
    if (!row.email) return [];
    return [{ profileId: row.profile_id, email: row.email, fullName: row.full_name ?? null }];
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
  const pool = getPostgresPool();
  const email = input.email.trim().toLowerCase();

  // Invalidate older outstanding links for this course+email.
  await pool.query(
    `UPDATE review_invites
     SET revoked_at = $1
     WHERE course_id = $2
       AND email = $3
       AND accepted_at IS NULL
       AND revoked_at IS NULL`,
    [new Date().toISOString(), input.courseId, email],
  );

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }>(
    `INSERT INTO review_invites (course_id, email, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, course_id, email, expires_at, accepted_at, revoked_at`,
    [input.courseId, email, hashToken(token), input.createdBy, expiresAt],
  );

  const data = rows[0];
  if (!data) {
    throw new Error("Failed to create review invite: no row returned");
  }

  return { token, invite: mapInvite(data) };
}

/**
 * Validates a raw invite token. Does NOT mutate state — call markInviteAccepted
 * only after the session has been minted successfully.
 */
export async function redeemReviewInvite(rawToken: string): Promise<RedeemResult> {
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }>(
    `SELECT id, course_id, email, expires_at, accepted_at, revoked_at
     FROM review_invites
     WHERE token_hash = $1
     LIMIT 1`,
    [hashToken(rawToken)],
  );

  const data = rows[0];
  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  // accepted_at is NOT a blocker — links are reusable; instructors have no password
  // and this link is their permanent entry point to the course.
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, invite: mapInvite(data) };
}

/** Marks an invite consumed so the link cannot be reused. */
export async function markInviteAccepted(inviteId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE review_invites SET accepted_at = $1 WHERE id = $2`,
    [new Date().toISOString(), inviteId],
  );
}
