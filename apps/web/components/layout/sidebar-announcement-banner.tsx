"use client"

import { useEffect, useState } from "react"
import { X, Info, AlertTriangle, OctagonAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { dismissAnnouncementAction } from "@/lib/announcements/actions"
import type { ActiveAnnouncement, AnnouncementSeverity } from "@/lib/announcements/types"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const SEVERITY_STYLES: Record<AnnouncementSeverity, { banner: string; icon: React.ReactNode; dot: string }> = {
  info: {
    banner: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    icon: <Info className="size-3 shrink-0 text-blue-400 mt-[1px]" />,
    dot: "bg-blue-400",
  },
  warning: {
    banner: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icon: <AlertTriangle className="size-3 shrink-0 text-amber-400 mt-[1px]" />,
    dot: "bg-amber-400",
  },
  critical: {
    banner: "border-red-500/30 bg-red-500/10 text-red-200",
    icon: <OctagonAlert className="size-3 shrink-0 text-red-400 mt-[1px]" />,
    dot: "bg-red-400",
  },
}

type RealtimeRow = {
  id: string
  message: string
  severity: string
  is_active: boolean
  updated_at: string
}

export function SidebarAnnouncementBanner({ initial }: { initial: ActiveAnnouncement | null }) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(initial)
  const [dismissed, setDismissed] = useState(initial?.isDismissed ?? false)

  // Live updates via Supabase Realtime
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel("announcements-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setAnnouncement(null)
            return
          }
          const row = payload.new as RealtimeRow
          if (!row.is_active) {
            setAnnouncement(null)
            return
          }
          // If updated_at changed the previous dismissal is stale — re-show
          setAnnouncement((prev) => {
            const updatedAtChanged = prev?.updatedAt !== row.updated_at
            if (updatedAtChanged) setDismissed(false)
            return {
              id: row.id,
              message: row.message,
              severity: row.severity as AnnouncementSeverity,
              updatedAt: row.updated_at,
              isDismissed: false,
            }
          })
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  async function handleDismiss() {
    if (!announcement) return
    setDismissed(true)
    await dismissAnnouncementAction(announcement.updatedAt)
  }

  if (!announcement || dismissed) return null

  const styles = SEVERITY_STYLES[announcement.severity]

  // Collapsed: colored dot indicator with tooltip
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mx-auto flex size-6 cursor-default items-center justify-center">
            <span className={cn("size-2 rounded-full animate-pulse", styles.dot)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] text-xs">
          {announcement.message}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Expanded: full banner
  return (
    <div
      className={cn(
        "mx-1 rounded-xl border px-2.5 py-2 text-[11px] leading-snug",
        styles.banner,
      )}
    >
      <div className="flex items-start gap-1.5">
        {styles.icon}
        <span className="flex-1 font-medium">{announcement.message}</span>
        <button
          onClick={handleDismiss}
          className="ml-1 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  )
}
