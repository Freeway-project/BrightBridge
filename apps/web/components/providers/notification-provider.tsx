"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Role } from "@coursebridge/workflow"

const IS_ADMIN = (role: Role) => role === "admin_full" || role === "super_admin"

interface NotificationProviderProps {
  children: React.ReactNode
  userId: string
  role: Role
}

export function NotificationProvider({ children, userId, role }: NotificationProviderProps) {
  const supabase = createClient()
  const router = useRouter()
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    if (!userId) return

    function dedup(id: string): boolean {
      if (seenIds.current.has(id)) return false
      seenIds.current.add(id)
      return true
    }

    // ── Course Issues ────────────────────────────────────────────────
    const issueChannel = supabase
      .channel("public:course_issues")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_issues" },
        async (payload) => {
          if (!dedup(`issue-${payload.new.id}`)) return
          if (payload.new.created_by === userId) return

          const courseHref = IS_ADMIN(role)
            ? `/admin/courses/${payload.new.course_id}`
            : `/courses/${payload.new.course_id}/issues`

          const severityMap: Record<string, string> = {
            critical: "🔴",
            major: "🟠",
            minor: "🟡",
          }
          const icon = severityMap[payload.new.severity] ?? "⚠️"

          toast.warning(`${icon} New Issue — ${payload.new.severity}`, {
            description: payload.new.title,
            duration: Infinity,
            action: { label: "View", onClick: () => router.push(courseHref) },
          })
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "course_issues" },
        async (payload) => {
          if (!dedup(`issue-status-${payload.new.id}-${payload.new.status}`)) return
          if (payload.old.status === payload.new.status) return
          if (payload.new.resolved_by === userId) return

          const courseHref = IS_ADMIN(role)
            ? `/admin/courses/${payload.new.course_id}`
            : `/courses/${payload.new.course_id}/issues`

          if (payload.new.status === "resolved") {
            toast.success("✅ Issue Resolved", {
              description: payload.new.title,
              duration: Infinity,
              action: { label: "View", onClick: () => router.push(courseHref) },
            })
          } else if (payload.new.status === "in_review") {
            toast.info("🔄 Issue In Review", {
              description: payload.new.title,
              duration: Infinity,
              action: { label: "View", onClick: () => router.push(courseHref) },
            })
          }
        }
      )
      .subscribe()

    // ── Issue Comments ───────────────────────────────────────────────
    const commentChannel = supabase
      .channel("public:course_issue_comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_issue_comments" },
        async (payload) => {
          if (!dedup(`comment-${payload.new.id}`)) return
          if (payload.new.author_id === userId) return
          if (payload.new.is_system_message) return

          const { data: issue } = await supabase
            .from("course_issues")
            .select("course_id, title")
            .eq("id", payload.new.issue_id)
            .single()

          if (!issue) return

          const courseHref = IS_ADMIN(role)
            ? `/admin/courses/${issue.course_id}`
            : `/courses/${issue.course_id}/issues`

          const body: string = payload.new.body
          toast.info("💬 New Comment", {
            description: body.length > 60 ? `${body.substring(0, 60)}…` : body,
            duration: Infinity,
            action: { label: "View", onClick: () => router.push(courseHref) },
          })
        }
      )
      .subscribe()

    // ── Course Assignments → TAs ─────────────────────────────────────
    const assignmentChannel = supabase
      .channel("public:course_assignments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_assignments" },
        async (payload) => {
          if (payload.new.profile_id !== userId) return
          if (!dedup(`assign-${payload.new.id}`)) return

          const { data: course } = await supabase
            .from("courses")
            .select("title")
            .eq("id", payload.new.course_id)
            .single()

          if (course) {
            toast.success("📚 New Course Assigned", {
              description: course.title,
              duration: Infinity,
              action: {
                label: "Open",
                onClick: () => router.push(`/courses/${payload.new.course_id}`),
              },
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(issueChannel)
      supabase.removeChannel(commentChannel)
      supabase.removeChannel(assignmentChannel)
    }
  }, [supabase, userId, role, router])

  return <>{children}</>
}
