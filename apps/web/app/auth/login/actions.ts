"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@coursebridge/workflow";
import { createClient } from "@/lib/supabase/server";

const devUsers: Record<Role, string> = {
  ta: "ta@coursebridge.dev",
  admin: "admin@coursebridge.dev",
  communications: "communications@coursebridge.dev",
  instructor: "instructor@coursebridge.dev",
  super_admin: "superadmin@coursebridge.dev"
};

const devPassword = "CourseBridgeDev123!";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/auth/login?error=missing_email");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
    }
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signInAsDevRole(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/auth/login?error=dev_login_unavailable");
  }

  const role = String(formData.get("role") ?? "") as Role;
  const email = devUsers[role];

  if (!email) {
    redirect("/auth/login?error=invalid_dev_role");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: devPassword
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
