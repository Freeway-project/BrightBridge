import "server-only";

import type { Role } from "@coursebridge/workflow";
import { getProfileRepository } from "@/lib/repositories";
import type { ProfileOption } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
import { getPostgresPool } from "@/lib/postgres/pool";
import { isPostgresProvider } from "@/lib/repositories/provider";
export type { ProfileOption } from "@/lib/repositories/contracts";

export async function getProfilesByRole(role: Role): Promise<ProfileOption[]> {
  return getProfileRepository().getProfilesByRole(role);
}

export async function getCourseInstructor(courseId: string): Promise<ProfileOption | null> {
  if (isPostgresProvider()) {
    const pool = getPostgresPool();
    const { rows } = await pool.query<{ id: string; email: string; full_name: string | null; role: Role }>(
      `
        SELECT p.id, p.email, p.full_name, p.role
        FROM course_assignments ca
        INNER JOIN profiles p ON p.id = ca.profile_id
        WHERE ca.course_id = $1
          AND ca.role = 'instructor'
        LIMIT 1
      `,
      [courseId],
    );
    const profile = rows[0];
    if (!profile) return null;
    return { id: profile.id, email: profile.email, fullName: profile.full_name, role: profile.role };
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("course_assignments")
    .select("profiles!course_assignments_profile_id_fkey(id, email, full_name, role)")
    .eq("course_id", courseId)
    .eq("role", "instructor")
    .maybeSingle();

  if (error || !data) return null;
  const p = data.profiles as unknown as { id: string; email: string; full_name: string | null; role: string } | null;
  if (!p) return null;
  return { id: p.id, email: p.email, fullName: p.full_name, role: p.role as Role };
}
