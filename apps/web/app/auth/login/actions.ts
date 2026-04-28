"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
