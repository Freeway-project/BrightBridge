"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface CourseWorkspaceRefreshWrapperProps {
  courseId: string
  title: string
  children: React.ReactNode
}

export function CourseWorkspaceRefreshWrapper({
  courseId: _courseId,
  title,
  children,
}: CourseWorkspaceRefreshWrapperProps) {
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Auto-refresh every 20 seconds for TA workspace (they see admin feedback)
  useAutoRefresh(refresh, 20000)

  return (
    <div className="flex flex-col gap-4">
      <RefreshHeader onRefresh={refresh} title={title} />
      {children}
    </div>
  )
}
