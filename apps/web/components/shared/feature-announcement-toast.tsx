"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Info } from "lucide-react"

/**
 * QUICK CONFIG: Update this object whenever you release a new feature!
 * Changing the 'id' will cause the toast to show again for eligible roles.
 */
const ANNOUNCEMENT_CONFIG = {
  id: "v2_ui_polish_dashboard_consolidation", // Change this ID to trigger a new announcement
  roles: ["admin_full", "super_admin"],
  title: "Dashboard UI & Experience Update",
  description:
    "The dashboard has been polished for better clarity! We've improved tab visibility, refined spacing, and consolidated the sidebar — moving all management tools (Courses, Users, Org, Audit, Migration) into centralized tabs.",
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
          description: "You're on the latest version of CourseBridge.",
          duration: 4000,
          position: "bottom-right",
        })
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [role])

  return null
}
