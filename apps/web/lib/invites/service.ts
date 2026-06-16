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
  expiresAt: string | null;   // null = never-expiring batch export link
  acceptedAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  firstAccessedAt: string | null;
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
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  access_count: number;
  first_accessed_at: string | null;
}): ReviewInvite {
  return {
    id: row.id,
    courseId: row.course_id,
    email: row.email,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    accessCount: row.access_count,
    firstAccessedAt: row.first_accessed_at,
  };
}

/** Returns true when a time-limited link has passed its expiry. Never-expiring (null) links never block. */
export function shouldBlockExpired(expiresAt: string | null): boolean {
  if (expiresAt === null) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/** Returns true when a one-time link has already been accepted. Never-expiring (null) links are multi-use. */
export function shouldBlockAccepted(expiresAt: string | null, acceptedAt: string | null): boolean {
  if (expiresAt === null) return false;
  return acceptedAt !== null;
}

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

export async function createReviewInvite(input: {
  courseId: string;
  email: string;
  createdBy: string;
  neverExpires?: boolean;
}): Promise<{ token: string; invite: ReviewInvite }> {
  const pool = getPostgresPool();
  const email = input.email.trim().toLowerCase();

  await pool.query(
    `UPDATE review_invites
     SET revoked_at = $1
     WHERE course_id = $2 AND email = $3 AND accepted_at IS NULL AND revoked_at IS NULL`,
    [new Date().toISOString(), input.courseId, email],
  );

  const token = randomBytes(32).toString("base64url");
  const expiresAt = input.neverExpires ? null : new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
  }>(
    `INSERT INTO review_invites (course_id, email, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, course_id, email, expires_at, accepted_at, revoked_at, access_count, first_accessed_at`,
    [input.courseId, email, hashToken(token), input.createdBy, expiresAt],
  );

  const data = rows[0];
  if (!data) throw new Error("Failed to create review invite: no row returned");
  return { token, invite: mapInvite(data) };
}

export async function redeemReviewInvite(rawToken: string): Promise<RedeemResult> {
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
  }>(
    `SELECT id, course_id, email, expires_at, accepted_at, revoked_at, access_count, first_accessed_at
     FROM review_invites WHERE token_hash = $1 LIMIT 1`,
    [hashToken(rawToken)],
  );

  const data = rows[0];
  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  if (shouldBlockAccepted(data.expires_at, data.accepted_at)) return { ok: false, reason: "expired" };
  if (shouldBlockExpired(data.expires_at)) return { ok: false, reason: "expired" };

  return { ok: true, invite: mapInvite(data) };
}

/** Marks a one-time invite consumed so the link cannot be reused. */
export async function markInviteAccepted(inviteId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE review_invites SET accepted_at = $1 WHERE id = $2`,
    [new Date().toISOString(), inviteId],
  );
}

/**
 * Records a click on a never-expiring invite link.
 * Increments access_count; sets first_accessed_at only on the first call.
 */
export async function recordInviteAccess(inviteId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE review_invites
     SET access_count = access_count + 1,
         first_accessed_at = COALESCE(first_accessed_at, NOW())
     WHERE id = $1`,
    [inviteId],
  );
}
