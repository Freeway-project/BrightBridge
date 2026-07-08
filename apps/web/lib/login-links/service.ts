import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getPostgresPool } from "@/lib/postgres/pool";

// Login links are permanent, reusable access tokens — an admin mints one so an
// existing user can open their dashboard without a password. Never expire; admin
// revokes by minting a fresh one (which revokes the prior active link) or in DB.

export type LoginLink = {
  id: string;
  profileId: string;
  revokedAt: string | null;
  accessCount: number;
  firstAccessedAt: string | null;
  lastAccessedAt: string | null;
};

export type RedeemLoginLinkResult =
  | { ok: true; link: LoginLink }
  | { ok: false; reason: "not_found" | "revoked" };

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function mapRow(row: {
  id: string;
  profile_id: string;
  revoked_at: string | null;
  access_count: number;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
}): LoginLink {
  return {
    id: row.id,
    profileId: row.profile_id,
    revokedAt: row.revoked_at,
    accessCount: row.access_count,
    firstAccessedAt: row.first_accessed_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

/** Production domain login links are handed out on. */
const PRODUCTION_SITE_URL = "https://coursebridge.okanagancollege.app";

function resolveSiteUrl(): string {
  // Mirrors buildInviteLink: in production ALWAYS use the canonical domain
  // (NEXT_PUBLIC_* vars are inlined at build time and can bake a stale URL).
  // Non-prod may override via NEXT_PUBLIC_SITE_URL, else falls back to localhost.
  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_URL;
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Builds the absolute magic-link URL for a raw login-link token. */
export function buildLoginLink(token: string): string {
  return `${resolveSiteUrl()}/auth/login-link/${encodeURIComponent(token)}`;
}

/**
 * Mints a fresh login link for a profile. Revokes any prior active link for the
 * same profile first, so at most one valid token exists per user (we only store
 * the hash, so a prior raw token can never be re-handed out).
 */
export async function createLoginLink(input: {
  profileId: string;
  createdBy: string;
}): Promise<{ token: string; link: LoginLink }> {
  const pool = getPostgresPool();

  await pool.query(
    `UPDATE login_links
     SET revoked_at = $1
     WHERE profile_id = $2 AND revoked_at IS NULL`,
    [new Date().toISOString(), input.profileId],
  );

  const token = randomBytes(32).toString("base64url");

  const { rows } = await pool.query<{
    id: string;
    profile_id: string;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
    last_accessed_at: string | null;
  }>(
    `INSERT INTO login_links (profile_id, token_hash, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, profile_id, revoked_at, access_count, first_accessed_at, last_accessed_at`,
    [input.profileId, hashToken(token), input.createdBy],
  );

  const data = rows[0];
  if (!data) throw new Error("Failed to create login link: no row returned");
  return { token, link: mapRow(data) };
}

export async function redeemLoginLink(rawToken: string): Promise<RedeemLoginLinkResult> {
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    id: string;
    profile_id: string;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
    last_accessed_at: string | null;
  }>(
    `SELECT id, profile_id, revoked_at, access_count, first_accessed_at, last_accessed_at
     FROM login_links WHERE token_hash = $1 LIMIT 1`,
    [hashToken(rawToken)],
  );

  const data = rows[0];
  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };

  return { ok: true, link: mapRow(data) };
}

/** Records a click: bumps access_count and sets first/last accessed timestamps. */
export async function recordLoginLinkAccess(linkId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE login_links
     SET access_count = access_count + 1,
         first_accessed_at = COALESCE(first_accessed_at, NOW()),
         last_accessed_at = NOW()
     WHERE id = $1`,
    [linkId],
  );
}
