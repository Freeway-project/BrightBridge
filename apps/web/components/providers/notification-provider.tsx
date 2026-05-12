"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Role } from "@coursebridge/workflow"

const IS_ADMIN = (role: Role) => role === "admin_full" || role === "super_admin"

const SEVERITY_ICON: Record<string, string> = {
  critical: "🔴",
  major:    "🟠",
  minor:    "🟡",
}

const TYPE_LABEL: Record<string, string> = {
  escalation: "Escalation",
  question:   "Question",
  fix_needed: "Fix Needed",
  general:    "Note",
}

interface NotificationProviderProps {
  children: React.ReactNode
  userId: string
  role: Role
}

export function NotificationProvider({ children, userId, role }: NotificationProviderProps) {
  const router = useRouter()
  const seenIds = useRef(new Set<string>())
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (!userId) return
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    function dedup(id: string): boolean {
      if (seenIds.current.has(id)) return false
      seenIds.current.add(id)
      return true
    }

    async function getCourseCode(courseId: string): Promise<string> {
      const { data } = await supabase
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single()
      return data?.title ?? "Unknown Course"
    }

    async function getAuthorName(authorId: string): Promise<string> {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authorId)
        .single()
      return data?.full_name ?? "Someone"
    }

    // ── New Issue Created ────────────────────────────────────────────
    const issueInsertChannel = supabase
      .channel("public:course_issues:insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_issues" },
        async (payload) => {
          if (!dedup(`issue-${payload.new.id}`)) return
          if (payload.new.created_by === userId) return

          const [courseTitle, authorName] = await Promise.all([
            getCourseCode(payload.new.course_id),
            getAuthorName(payload.new.created_by),
          ])

          const icon = SEVERITY_ICON[payload.new.severity] ?? "⚠️"
          const typeLabel = TYPE_LABEL[payload.new.type] ?? "Issue"
          const href = IS_ADMIN(role)
            ? `/admin/courses/${payload.new.course_id}`
            : `/courses/${payload.new.course_id}/issues`

          toast.warning(`${icon} New ${typeLabel}`, {
            description: (
              <div className="space-y-2">
                <p className="font-semibold">{payload.new.title}</p>
                <p className="text-xs text-muted-foreground">
                  Raised by {authorName} • {payload.new.severity} severity
                </p>
                <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                {payload.new.description && (
                  <p className="text-xs italic">&quot;{payload.new.description.substring(0, 80)}{payload.new.description.length > 80 ? '…' : ''}&quot;</p>
                )}
              </div>
            ),
            duration: Infinity,
            action: { label: "View Issue →", onClick: () => router.push(href) },
          })
        }
      )
      .subscribe()

    // ── Issue Status Changed ─────────────────────────────────────────
    const issueUpdateChannel = supabase
      .channel("public:course_issues:update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "course_issues" },
        async (payload) => {
          if (!dedup(`issue-status-${payload.new.id}-${payload.new.status}`)) return
          if (payload.old.status === payload.new.status) return
          if (payload.new.resolved_by === userId) return

          const courseTitle = await getCourseCode(payload.new.course_id)
          const href = IS_ADMIN(role)
            ? `/admin/courses/${payload.new.course_id}`
            : `/courses/${payload.new.course_id}/issues`

          const statusMap: Record<string, { icon: string; label: string; color: string }> = {
            resolved: { icon: "✅", label: "Resolved", color: "text-green-600" },
            in_review: { icon: "🔄", label: "In Review", color: "text-blue-600" },
            open: { icon: "↩️", label: "Reopened", color: "text-yellow-600" },
          }

          const status = statusMap[payload.new.status] || { icon: "📌", label: "Updated", color: "text-primary" }

          if (payload.new.status === "resolved") {
            toast.success(`${status.icon} Issue Resolved`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: open → <span className="font-semibold text-green-600">resolved</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details >", onClick: () => router.push(href) },
            })
          } else if (payload.new.status === "in_review") {
            toast.info(`${status.icon} Issue In Review`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: <span className="text-yellow-600">open</span> → <span className="font-semibold text-blue-600">in review</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details >", onClick: () => router.push(href) },
            })
          } else if (payload.new.status === "open") {
            toast.warning(`${status.icon} Issue Reopened`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: <span className="text-green-600">resolved</span> → <span className="font-semibold text-yellow-600">open</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details >", onClick: () => router.push(href) },
            })
          }
        }
      )
      .subscribe()

    // ── New Comment on Issue ─────────────────────────────────────────
    const commentChannel = supabase
      .channel("public:course_issue_comments:insert")
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

          const [courseTitle, authorName] = await Promise.all([
            getCourseCode(issue.course_id),
            getAuthorName(payload.new.author_id),
          ])

          const href = IS_ADMIN(role)
            ? `/admin/courses/${issue.course_id}`
            : `/courses/${issue.course_id}/issues`

          const body: string = payload.new.body
          const preview = body.length > 80 ? `${body.substring(0, 80)}…` : body

          toast.info("💬 New Comment", {
            description: (
              <div className="space-y-2">
                <p className="font-semibold">{issue.title}</p>
                <p className="text-xs text-muted-foreground italic">&quot;{preview}&quot;</p>
                <p className="text-xs text-muted-foreground">
                  By {authorName} on {courseTitle}
                </p>
              </div>
            ),
            duration: Infinity,
            action: { label: "Reply →", onClick: () => router.push(href) },
          })
        }
      )
      .subscribe()

    // ── Course Assignment → TA ───────────────────────────────────────
    const assignmentChannel = supabase
      .channel("public:course_assignments:insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_assignments" },
        async (payload) => {
          if (payload.new.profile_id !== userId) return
          if (!dedup(`assign-${payload.new.id}`)) return

          const courseTitle = await getCourseCode(payload.new.course_id)

          toast.success("📚 Course Assigned to You", {
            description: `You've been assigned to review "${courseTitle}" — start when ready`,
            duration: Infinity,
            action: {
              label: "Open Review →",
              onClick: () => router.push(`/courses/${payload.new.course_id}/metadata`),
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(issueInsertChannel)
      supabase.removeChannel(issueUpdateChannel)
      supabase.removeChannel(commentChannel)
      supabase.removeChannel(assignmentChannel)
    }
  }, [userId, role, router])

  return <>{children}</>
}
