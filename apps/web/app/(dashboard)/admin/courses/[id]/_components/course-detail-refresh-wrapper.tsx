"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { refreshAdminCourseDetail } from "@/app/(dashboard)/refresh-actions"
import { useCallback } from "react"

interface CourseDetailRefreshWrapperProps {
  courseId: string
  title: string
  children: React.ReactNode
}

export function CourseDetailRefreshWrapper({
  courseId,
  title,
  children,
}: CourseDetailRefreshWrapperProps) {
  // Create stable callback for this course
  const refreshCallback = useCallback(
    () => refreshAdminCourseDetail(courseId),
    [courseId]
  )

  // Auto-refresh every 10 seconds for course detail (shows escalation messages, TA updates)
  useAutoRefresh(refreshCallback, 10000)

  return (
    <div className="flex flex-col gap-4">
      <RefreshHeader onRefresh={refreshCallback} title={title} />
      {children}
    </div>
  )
}
