"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Info } from "lucide-react"
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti"

/**
 * QUICK CONFIG: Update this object whenever you release a new feature!
 * Changing the 'id' will cause the toast to show again for eligible roles.
 */
const ANNOUNCEMENT_CONFIG = {
  id: "v3_migration_dashboard_release_notes", // Change this ID to trigger a new announcement
  roles: ["admin_full", "super_admin"],
  title: "Migration + Dashboard Update",
  description:
    "What’s now live: (1) Admin Overview with 5 KPI cards + status breakdown + staff workload table, (2) Migration panel/tab for run summary and problematic rows, (3) dashboard tab/spacing polish, (4) upgraded release notifications (persistent info toast + quick success booper). Data work included: TA CSV importer run, 95 rows processed, 285 review responses upserted, 166 status events inserted, URL/term/code normalization, and run artifacts in docs/migration-runs. Next: move Escalations + Migration from tabs to dedicated sidebar items for admin and super-admin.",
}

interface AnnouncementToastProps {
  role: string
}

export function FeatureAnnouncementToast({ role }: AnnouncementToastProps) {
  useEffect(() => {
    // Check if current user's role is in the announcement target list
    if (!ANNOUNCEMENT_CONFIG.roles.includes(role)) return

    const STORAGE_KEY = `cb_announcement_seen_${ANNOUNCEMENT_CONFIG.id}`
    const hasSeen = localStorage.getItem(STORAGE_KEY)

    if (!hasSeen) {
      const timer = setTimeout(() => {
        toast.info(ANNOUNCEMENT_CONFIG.title, {
          description: ANNOUNCEMENT_CONFIG.description,
          duration: Infinity,
          position: "top-center",
          closeButton: true,
          icon: <Info className="size-4 text-blue-500" />,
          onDismiss: () => localStorage.setItem(STORAGE_KEY, "true"),
        })
        toast.success("Dashboard updated", {
          description: "Open Migration to see full run details, stats, and problematic rows.",
          duration: 4000,
          position: "bottom-right",
        })
        playUpgradeConfetti({ durationMs: 2200 })
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [role])

  return null
}
