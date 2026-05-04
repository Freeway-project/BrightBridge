import "server-only";

import type { Role } from "@coursebridge/workflow";
import { getProfileRepository } from "@/lib/repositories";
import type { ProfileOption } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
export type { ProfileOption } from "@/lib/repositories/contracts";

export async function getProfilesByRole(role: Role): Promise<ProfileOption[]> {
  return getProfileRepository().getProfilesByRole(role);
}

export async function getCourseInstructor(courseId: string): Promise<ProfileOption | null> {
  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("course_assignments")
    .select("profiles!course_assignments_profile_id_fkey(id, email, full_name, role)")
    .eq("course_id", courseId)
    .eq("role", "instructor")
    .maybeSingle();

  if (error || !data) return null;
  const p = data.profiles as { id: string; email: string; full_name: string | null; role: string } | null;
  if (!p) return null;
  return { id: p.id, email: p.email, fullName: p.full_name, role: p.role as Role };
}
