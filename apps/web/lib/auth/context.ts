import "server-only";

import { redirect } from "next/navigation";
import { ROLES, type Role } from "@coursebridge/workflow";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "anonymous" };
  }

  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.");

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }

  if (!profile) {
    return {
      kind: "missing_profile",
      userId: user.id,
      email: user.email ?? null
    };
  }

  if (!isRole(profile.role)) {
    throw new Error(`Profile has unsupported role: ${profile.role}`);
  }

  return {
    kind: "profile",
    userId: user.id,
    email: user.email ?? null,
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role
    }
  };
}

export async function requireProfile() {
  const context = await getAuthContext();

  if (context.kind === "anonymous") redirect("/auth/login");
  if (context.kind === "missing_profile") redirect("/auth/login");

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
  return ROLES.includes(value as Role);
}
