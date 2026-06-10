import "server-only";

import { redirect } from "next/navigation";
import { ROLES, type Role } from "@coursebridge/workflow";
import { getProfileRepository } from "@/lib/repositories";
import { getAuthService } from "./service";

export type AppProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

export type AuthContext =
  | { kind: "anonymous" }
  | { kind: "missing_profile"; userId: string; email: string | null }
  | { kind: "profile"; userId: string; email: string | null; profile: AppProfile };

// Maps Azure Entra app-role claim values to internal CourseBridge roles. Keys are
// normalized (lowercased, spaces/hyphens -> underscore) before lookup.
const ROLE_CLAIM_MAP: Record<string, Role> = {
  super_admin: "super_admin",
  superadmin: "super_admin",
  provost: "provost",
  admin_full: "admin_full",
  adminfull: "admin_full",
  admin_viewer: "admin_viewer",
  adminviewer: "admin_viewer",
  standard_user: "standard_user",
  standarduser: "standard_user",
  staff: "standard_user",
  ta: "standard_user",
  instructor: "instructor",
};

function normalizeRoleClaimValue(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function resolveRoleFromClaims(userMetadata: Record<string, unknown>): Role | null {
  const raw = userMetadata.oidc_roles;
  if (!Array.isArray(raw)) {
    return null;
  }

  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = normalizeRoleClaimValue(entry);
    const candidates = [normalized];

    // Azure app roles can be emitted with prefixes, e.g. "CourseBridge.Admin_Full".
    const dottedParts = normalized.split(".");
    if (dottedParts.length > 1) {
      candidates.push(dottedParts[dottedParts.length - 1]);
    }

    const slashParts = normalized.split("/");
    if (slashParts.length > 1) {
      candidates.push(slashParts[slashParts.length - 1]);
    }

    let mapped: Role | undefined;
    for (const candidate of candidates) {
      mapped = ROLE_CLAIM_MAP[candidate];
      if (mapped) {
        break;
      }
    }

    if (mapped) {
      return mapped;
    }
  }

  return null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const user = await getAuthService().getCurrentSessionUser();

  if (!user) {
    return { kind: "anonymous" };
  }

  const profileRepository = getProfileRepository();
  const profileById = await profileRepository.getProfileById(user.id);
  const profileByEmail = profileById
    ? null
    : user.email
      ? await profileRepository.getProfileByEmail(user.email)
      : null;

  // Link-by-email on first Azure OIDC sign-in: legacy profile rows carry the
  // old Supabase auth UUID. Re-key the row to the Entra `oid` so subsequent
  // requests hit the fast id path. Skipped if id already matches or the row
  // somehow already has the new id under a different shape.
  if (profileByEmail && profileByEmail.id !== user.id) {
    try {
      await profileRepository.relinkProfileId(profileByEmail.id, user.id);
      profileByEmail.id = user.id;
    } catch (error) {
      // If the rewrite collides (e.g. another row already owns user.id) just
      // proceed with the legacy id — the session still works, we just keep
      // taking the email-lookup path. The error is worth surfacing.
      console.warn(
        "[auth] relink_failed",
        JSON.stringify({
          oldId: profileByEmail.id,
          newId: user.id,
          email: user.email,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  const profile = profileById ?? profileByEmail;
  const claimedRole = resolveRoleFromClaims(user.userMetadata);
  const claimedFullNameRaw = typeof user.userMetadata.full_name === "string"
    ? user.userMetadata.full_name.trim()
    : "";
  const claimedFullName = claimedFullNameRaw.length > 0 ? claimedFullNameRaw : null;

  if (!profile) {
    // For Azure OIDC users, auto-provision when app-role claims are present.
    if (claimedRole && user.email) {
      await profileRepository.upsertProfile({
        id: user.id,
        email: user.email,
        fullName: claimedFullName,
        role: claimedRole,
      });

      return {
        kind: "profile",
        userId: user.id,
        email: user.email,
        profile: {
          id: user.id,
          email: user.email,
          fullName: claimedFullName,
          role: claimedRole,
        },
      };
    }

    console.warn(
      "[auth] missing_profile",
      JSON.stringify({
        userId: user.id,
        email: user.email,
        hasClaimedRole: Boolean(claimedRole),
        rawRoles: user.userMetadata.oidc_roles ?? null,
      }),
    );

    return {
      kind: "missing_profile",
      userId: user.id,
      email: user.email,
    };
  }

  const targetRole = claimedRole ?? profile.role;
  const targetFullName = claimedFullName ?? profile.fullName;
  const targetEmail = user.email ?? profile.email;

  const shouldSyncProfile =
    targetRole !== profile.role ||
    targetFullName !== profile.fullName ||
    targetEmail !== profile.email;

  let effectiveProfile = profile;

  if (shouldSyncProfile) {
    await profileRepository.upsertProfile({
      id: profile.id,
      email: targetEmail,
      fullName: targetFullName,
      role: targetRole,
    });
    effectiveProfile = {
      ...profile,
      email: targetEmail,
      fullName: targetFullName,
      role: targetRole,
    };
  }

  if (!isRole(effectiveProfile.role)) {
    throw new Error(`Profile has unsupported role: ${effectiveProfile.role}`);
  }

  return {
    kind: "profile",
    userId: effectiveProfile.id,
    email: user.email,
    profile: {
      id: effectiveProfile.id,
      email: effectiveProfile.email,
      fullName: effectiveProfile.fullName,
      role: effectiveProfile.role,
    },
  };
}

export async function requireProfile() {
  const context = await getAuthContext();

  if (context.kind === "anonymous") redirect("/auth/login");
  if (context.kind === "missing_profile") redirect("/auth/no-access");

  return context;
}

export function requireAnyRole(
  context: Extract<AuthContext, { kind: "profile" }>,
  roles: readonly Role[],
) {
  if (!roles.includes(context.profile.role)) {
    redirect("/dashboard");
  }
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
