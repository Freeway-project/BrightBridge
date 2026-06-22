import type { Role } from "@coursebridge/workflow"
import type { AppProfile, AuthContext } from "@/lib/auth/context"
import type { AssistantScope } from "./types"

const ALLOWED_ROLES: readonly Role[] = ["provost", "admin_full", "super_admin"]

export function canAccessAssistant(profile: AppProfile): boolean {
  return ALLOWED_ROLES.includes(profile.role)
}

export function requireAssistantProfile(
  context: AuthContext,
): Extract<AuthContext, { kind: "profile" }> {
  if (context.kind !== "profile" || !canAccessAssistant(context.profile)) {
    throw new Error("FORBIDDEN_ASSISTANT_ACCESS")
  }
  return context
}

export function getAssistantScope(profile: AppProfile): AssistantScope {
  if (!canAccessAssistant(profile)) {
    throw new Error("FORBIDDEN_ASSISTANT_ACCESS")
  }

  return {
    kind: "institution",
    allowedRoles: [profile.role],
  }
}

export { ALLOWED_ROLES as ASSISTANT_ALLOWED_ROLES }
