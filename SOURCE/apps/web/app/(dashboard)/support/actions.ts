"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
import { getPostgresPool } from "@/lib/postgres/pool";
import { isPostgresProvider } from "@/lib/repositories/provider";

const SENDER_ROLES = ["standard_user", "admin_full"] as const;

export type SupportActionState = {
  kind: "success" | "error";
  message: string;
};

export async function pokeItSupportAction(): Promise<SupportActionState> {
  const context = await requireProfile();
  requireAnyRole(context, SENDER_ROLES);

  if (isPostgresProvider()) {
    try {
      const pool = getPostgresPool();
      await pool.query(
        `
          INSERT INTO support_messages (sender_profile_id, sender_role, type, subject, body)
          VALUES ($1, $2, 'poke', 'Poke IT Support', 'User poked IT support from the dashboard.')
        `,
        [context.profile.id, context.profile.role],
      );
    } catch {
      return { kind: "error", message: "Could not poke IT support. Try again in a moment." };
    }
  } else {
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
      return { kind: "error", message: "Could not poke IT support. Try again in a moment." };
    }
  }

  revalidatePath("/notifications");

  return {
    kind: "success",
    message: "IT support was poked. Harsh has been notified.",
  };
}

// Super-admin resolves a support message from the Support panel.
export async function resolveSupportMessageAction(
  id: string,
): Promise<SupportActionState> {
  const context = await requireProfile();
  requireAnyRole(context, ["super_admin"]);

  if (isPostgresProvider()) {
    try {
      const pool = getPostgresPool();
      await pool.query(
        `
          UPDATE support_messages
          SET status = 'resolved', resolved_at = NOW(), resolved_by_profile_id = $2
          WHERE id = $1
        `,
        [id, context.profile.id],
      );
    } catch {
      return { kind: "error", message: "Could not resolve this message. Try again in a moment." };
    }
  } else {
    const { error } = await getSupabaseAdminClientOrThrow()
      .from("support_messages")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by_profile_id: context.profile.id,
      })
      .eq("id", id);

    if (error) {
      return {
        kind: "error",
        message: "Could not resolve this message. Try again in a moment.",
      };
    }
  }

  revalidatePath("/super-admin");
  revalidatePath("/notifications");

  return { kind: "success", message: "Marked as resolved." };
}
