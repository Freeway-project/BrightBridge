"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";

const SENDER_ROLES = ["standard_user", "admin_full"] as const;

export type SupportActionState = {
  kind: "success" | "error";
  message: string;
};

export async function pokeItSupportAction(): Promise<SupportActionState> {
  const context = await requireProfile();
  requireAnyRole(context, SENDER_ROLES);

  const { error } = await getSupabaseAdminClientOrThrow()
    .from("support_messages")
    .insert({
      sender_profile_id: context.profile.id,
      sender_role: context.profile.role,
      type: "poke",
      subject: "Poke IT Support",
      body: "User poked IT support from the dashboard.",
    });

  if (error) {
    return {
      kind: "error",
      message: "Could not poke IT support. Try again in a moment.",
    };
  }

  revalidatePath("/notifications");

  return {
    kind: "success",
    message: "IT support was poked. Super Admin has been notified.",
  };
}
