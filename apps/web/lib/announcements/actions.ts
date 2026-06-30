"use server"

import { requireProfile } from "@/lib/auth/context"
import { createAdminClient } from "@/lib/supabase/admin"

/** Any authenticated user can dismiss the banner. Stored ts must match announcement.updated_at
 *  so re-publishing (which bumps updated_at) automatically re-shows the banner. */
export async function dismissAnnouncementAction(updatedAt: string): Promise<void> {
  const context = await requireProfile()
  const supabase = createAdminClient()
  if (!supabase) return

  await supabase
    .from("dismissed_announcements")
    .upsert(
      { profile_id: context.profile.id, dismissed_at_ts: updatedAt },
      { onConflict: "profile_id" },
    )
}
