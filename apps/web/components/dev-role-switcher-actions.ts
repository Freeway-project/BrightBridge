"use server";

import { revalidatePath } from "next/cache";
import { ROLES, type Role } from "@coursebridge/workflow";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function switchDevRole(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev role switching is only available in development.");
  }

  const role = String(formData.get("role") ?? "") as Role;

  if (!ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("You must be signed in to switch roles.");
  }

  const admin = createAdminClient();

  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for dev role switcher.");
  }

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : user.email,
      role
    },
    {
      onConflict: "id"
    }
  );

  if (error) {
    throw new Error(`Could not switch dev role: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
}
