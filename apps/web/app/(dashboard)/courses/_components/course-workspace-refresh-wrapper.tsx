"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useCallback } from "react"

interface CourseWorkspaceRefreshWrapperProps {
  courseId: string
  title: string
  refreshCallback: () => Promise<void>
  children: React.ReactNode
}

export function CourseWorkspaceRefreshWrapper({
  courseId,
  title,
  refreshCallback,
  children,
}: CourseWorkspaceRefreshWrapperProps) {
  // Create stable callback
  const stableRefreshCallback = useCallback(refreshCallback, [courseId])

  // Auto-refresh every 20 seconds for TA workspace (they see admin feedback)
  useAutoRefresh(stableRefreshCallback, 20000)

  return (
    <div className="flex flex-col gap-4">
      <RefreshHeader onRefresh={stableRefreshCallback} title={title} />
      {children}
    </div>
  )
}
