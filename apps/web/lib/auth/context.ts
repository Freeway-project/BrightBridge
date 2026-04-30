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

export async function getAuthContext(): Promise<AuthContext> {
  const user = await getAuthService().getCurrentSessionUser();

  if (!user) {
    return { kind: "anonymous" };
  }

  const profile = await getProfileRepository().getProfileById(user.id);
  if (!profile) {
    return {
      kind: "missing_profile",
      userId: user.id,
      email: user.email
    };
  }

  if (!isRole(profile.role)) {
    throw new Error(`Profile has unsupported role: ${profile.role}`);
  }

  return {
    kind: "profile",
    userId: user.id,
    email: user.email,
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
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
  return (ROLES as readonly string[]).includes(value);
}
