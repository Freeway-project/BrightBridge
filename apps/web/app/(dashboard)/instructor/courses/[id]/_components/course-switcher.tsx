"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Layers } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"

export type SwitcherCourse = {
  id: string
  title: string
  status: CourseStatus
}

/**
 * Lets the instructor jump straight to another of their assigned courses
 * without returning to the dashboard. Rendered in the course-detail header.
 */
export function CourseSwitcher({
  currentId,
  courses,
  className,
}: {
  currentId: string
  courses: SwitcherCourse[]
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Nothing to switch to — don't clutter the header.
  if (courses.length < 2) return null

  return (
    <Select
      value={currentId}
      onValueChange={(id) => {
        if (id === currentId) return
        startTransition(() => router.push(`/instructor/courses/${id}`))
      }}
    >
      <SelectTrigger
        aria-label="Switch to another course"
        className={cn("h-8 max-w-[220px] gap-2 text-sm", className)}
        data-pending={isPending ? "" : undefined}
      >
        <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue placeholder="Switch course" />
      </SelectTrigger>
      <SelectContent align="end" className="max-w-[320px]">
        {courses.map((c) => (
          <SelectItem key={c.id} value={c.id} className="gap-2">
            <span className="flex items-center gap-2">
              <span className="truncate">{c.title}</span>
              <StatusBadge status={c.status} className="text-[10px] shrink-0" />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
