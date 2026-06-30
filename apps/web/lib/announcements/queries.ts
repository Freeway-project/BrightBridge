import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { ActiveAnnouncement, CurrentAnnouncement, AnnouncementSeverity } from "./types"

export type { ActiveAnnouncement, CurrentAnnouncement, AnnouncementSeverity }

/** Used by dashboard layout to SSR-render the sidebar banner. */
export async function getActiveAnnouncement(userId: string): Promise<ActiveAnnouncement | null> {
  const supabase = createAdminClient()
  if (!supabase) return null

  const { data: row } = await supabase
    .from("announcements")
    .select("id, message, severity, updated_at")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!row) return null

  const { data: dismissal } = await supabase
    .from("dismissed_announcements")
    .select("dismissed_at_ts")
    .eq("profile_id", userId)
    .single()

  const isDismissed =
    !!dismissal &&
    new Date(dismissal.dismissed_at_ts).getTime() === new Date(row.updated_at).getTime()

  return {
    id: row.id,
    message: row.message,
    severity: row.severity as AnnouncementSeverity,
    updatedAt: row.updated_at as string,
    isDismissed,
  }
}

/** Used by super-admin panel to show the current announcement state (active or draft). */
export async function getCurrentAnnouncement(): Promise<CurrentAnnouncement | null> {
  const supabase = createAdminClient()
  if (!supabase) return null

  const { data: row } = await supabase
    .from("announcements")
    .select("id, message, severity, is_active, updated_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!row) return null

  return {
    id: row.id,
    message: row.message,
    severity: row.severity as AnnouncementSeverity,
    isActive: row.is_active as boolean,
    updatedAt: row.updated_at as string,
  }
}
