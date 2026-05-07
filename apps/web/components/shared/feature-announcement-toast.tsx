"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Info } from "lucide-react"

/**
 * QUICK CONFIG: Update this object whenever you release a new feature!
 * Changing the 'id' will cause the toast to show again for eligible roles.
 */
const ANNOUNCEMENT_CONFIG = {
  id: "v1_multi_assign_audit", // Change this ID to trigger a new announcement
  roles: ["admin_full", "super_admin"],
  title: "New: Multi-Select Assignment & Audit Trail",
  description: "You can now assign TAs to multiple courses at once and track all recent assignment activity at the bottom of the page.",
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
          duration: 10000,
          position: "top-center",
          icon: <Info className="size-4 text-blue-500" />,
          onAutoClose: () => localStorage.setItem(STORAGE_KEY, "true"),
          onDismiss: () => localStorage.setItem(STORAGE_KEY, "true"),
        })
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [role])

  return null
}
