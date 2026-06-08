import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import type { Role } from "@coursebridge/workflow";
import { getProfileRepository } from "@/lib/repositories";
import type { ProfileOption } from "@/lib/repositories/contracts";
export type { ProfileOption } from "@/lib/repositories/contracts";

export async function getProfilesByRole(role: Role): Promise<ProfileOption[]> {
  return getProfileRepository().getProfilesByRole(role);
}

export async function getCourseInstructor(courseId: string): Promise<ProfileOption | null> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
  }>(
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
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
}
