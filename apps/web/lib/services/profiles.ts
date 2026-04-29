import "server-only";

import type { Role } from "@coursebridge/workflow";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileOption = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

function admin() {
  const client = createAdminClient();
  if (!client) throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.");
  return client;
}

export async function getProfilesByRole(role: Role): Promise<ProfileOption[]> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", role)
    .order("full_name", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`getProfilesByRole: ${error.message}`);

  return (data ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
  }));
}
