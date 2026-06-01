"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface CourseDetailRefreshWrapperProps {
  courseId: string
  title: string
  children: React.ReactNode
}

export function CourseDetailRefreshWrapper({
  courseId: _courseId,
  title,
  children,
}: CourseDetailRefreshWrapperProps) {
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Auto-refresh every 10 seconds for course detail (shows escalation messages, TA updates)
  useAutoRefresh(refresh, 10000)

  return (
    <div className="flex flex-col gap-4">
      <RefreshHeader onRefresh={refresh} title={title} />
      {children}
    </div>
  )
}
