"use server";

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

export type ActionState = {
  error?: string;
  success?: boolean;
  email?: string;
};

export async function sendOTP(email: string): Promise<ActionState> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { error: "Email is required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      // If we don't provide a redirect, Supabase defaults to sending a 6-digit code
      // that can be verified via the API.
      shouldCreateUser: true,
    }
  });

  if (error) return { error: error.message };
  return { success: true, email: cleanEmail };
}

export async function verifyOTP(email: string, token: string): Promise<ActionState> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) return { error: error.message };
  
  // Verification successful, Next.js Middleware/Supabase will handle the session.
  // We redirect to /dashboard which will then route based on role.
  redirect("/dashboard");
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
