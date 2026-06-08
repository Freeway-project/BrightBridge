"use server";

import { revalidatePath } from "next/cache";
import { ROLES, type Role } from "@coursebridge/workflow";
import { getAuthService } from "@/lib/auth/service";
import { getProfileRepository } from "@/lib/repositories";

export async function switchDevRole(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev role switching is only available in development.");
  }

  const role = String(formData.get("role") ?? "") as Role;

  if (!ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const user = await getAuthService().getCurrentSessionUser();

  if (!user?.email) {
    throw new Error("You must be signed in to switch roles.");
  }

  await getProfileRepository().upsertProfile({
    id: user.id,
    email: user.email,
    fullName:
      typeof user.userMetadata.full_name === "string"
        ? user.userMetadata.full_name
        : user.email,
    role
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
}
