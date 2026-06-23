"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthService } from "@/lib/auth/service";
import { getProfileRepository } from "@/lib/repositories";
import type { Role } from "@coursebridge/workflow";

export async function signOut() {
  await getAuthService().signOut();
  redirect("/auth/login");
}

export async function impersonateUserAction(userId: string) {
  const user = await getAuthService().getCurrentSessionUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const profile = await getProfileRepository().getProfileById(user.id);
  if (!profile || profile.role !== "admin_full") {
    throw new Error("Unauthorized: only admin_full can impersonate");
  }

  const cookieStore = await cookies();
  cookieStore.set("coursebridge_impersonate_user_id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
  });

  redirect("/dashboard");
}

export async function stopImpersonatingAction() {
  const cookieStore = await cookies();
  cookieStore.delete("coursebridge_impersonate_user_id");
  redirect("/dashboard");
}

export async function getImpersonatableUsersAction(search = "") {
  const user = await getAuthService().getCurrentSessionUser();
  if (!user) {
    return [];
  }

  const profile = await getProfileRepository().getProfileById(user.id);
  if (!profile || profile.role !== "admin_full") {
    return [];
  }

  const result = await getProfileRepository().listUsers(1, 100, search);
  return result.data.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role as Role,
  }));
}
