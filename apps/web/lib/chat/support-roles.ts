import type { Role } from "@coursebridge/workflow";

/**
 * Roles that receive and answer "Chat with Admin" support conversations.
 * Every other role gets the "Chat with Admin" button; these roles instead see
 * each user's "Support: {name}" conversation in their sidebar and reply there.
 */
export const SUPPORT_ADMIN_ROLES = ["super_admin", "admin_full"] as const;

export function isSupportAdmin(role: Role): boolean {
  return (SUPPORT_ADMIN_ROLES as readonly string[]).includes(role);
}
