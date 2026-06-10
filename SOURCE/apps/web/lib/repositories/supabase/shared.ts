import "server-only";

import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow";
import { createAdminClient } from "@/lib/supabase/admin";

export function getSupabaseAdminClientOrThrow() {
  const client = createAdminClient();

  if (!client) {
    throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.");
  }

  return client;
}

export function cleanOptionalText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export function toCourseStatus(value: string): CourseStatus {
  if (!COURSE_STATUSES.includes(value as CourseStatus)) {
    throw new Error(`Unsupported course status: ${value}`);
  }

  return value as CourseStatus;
}
