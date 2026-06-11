import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileRepository } from "@/lib/repositories";

/**
 * Idempotently ensures an auth user + instructor profile exist for an email.
 * Used by the invite-redemption route so a magic-link can always be minted,
 * even in the rare case the instructor's auth account was never created. Runs
 * with the service-role client (the clicker is not yet authenticated).
 */
export async function ensureInstructorIdentity(email: string, fullName?: string | null): Promise<string> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  const normalized = email.trim().toLowerCase();

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to look up users: ${listError.message}`);
  }

  let userId = list.users.find((u) => u.email?.toLowerCase() === normalized)?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      password: randomBytes(12).toString("base64url"),
      email_confirm: true,
      user_metadata: { full_name: fullName ?? undefined, role: "instructor" },
    });
    if (error || !data.user) {
      throw new Error(`Failed to create instructor account: ${error?.message ?? "no user returned"}`);
    }
    userId = data.user.id;
  }

  await getProfileRepository().upsertProfile({
    id: userId,
    email: normalized,
    fullName: fullName ?? null,
    role: "instructor",
  });

  return userId;
}
