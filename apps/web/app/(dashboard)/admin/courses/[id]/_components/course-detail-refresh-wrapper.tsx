"use client"

import { RefreshHeader } from "@/components/shared/refresh-header"
import { useAutoRefresh } from "@/lib/workspace/use-auto-refresh"
import { useCourseCommentRealtime } from "@/lib/workspace/use-course-comment-realtime"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const refresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Live push via Supabase Realtime; 60s polling as fallback
  useCourseCommentRealtime(courseId, () => router.refresh())
  useAutoRefresh(refresh, 60000)

  return (
    <div className="flex flex-col gap-4">
      <RefreshHeader onRefresh={refresh} title={title} />
      {children}
    </div>
  )
}
