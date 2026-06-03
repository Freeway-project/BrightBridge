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

let audioContext: AudioContext | null = null

function playNotificationTone(type: "info" | "success" | "warning" = "info") {
  if (typeof window === "undefined") return

  try {
    audioContext ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioContext.state === "suspended") {
      void audioContext.resume()
    }

    const now = audioContext.currentTime
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const chirpMap: Record<typeof type, { start: number; peak: number; tail: number }> = {
      info: { start: 1200, peak: 2100, tail: 1550 },
      success: { start: 1300, peak: 2400, tail: 1800 },
      warning: { start: 900, peak: 1700, tail: 1200 },
    }

    const preset = chirpMap[type]
    osc.type = "triangle"
    osc.frequency.setValueAtTime(preset.start, now)
    osc.frequency.exponentialRampToValueAtTime(preset.peak, now + 0.055)
    osc.frequency.exponentialRampToValueAtTime(preset.tail, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.006, now + 0.07)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start(now)
    osc.stop(now + 0.17)
  } catch {
    // Best-effort UI enhancement only.
  }
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

  // Pre-enable AudioContext on user interaction to bypass browser autoplay restrictions
  useEffect(() => {
    if (typeof window === "undefined") return

    const initAudio = () => {
      try {
        audioContext ??= new (window.AudioContext || (window as any).webkitAudioContext)()
        if (audioContext.state === "suspended") {
          void audioContext.resume()
        }
      } catch (e) {
        // best-effort
      }
    }

    const handleInteraction = () => {
      initAudio()
      cleanup()
    }

    const cleanup = () => {
      window.removeEventListener("click", handleInteraction)
      window.removeEventListener("keydown", handleInteraction)
      window.removeEventListener("touchstart", handleInteraction)
    }

    window.addEventListener("click", handleInteraction)
    window.addEventListener("keydown", handleInteraction)
    window.addEventListener("touchstart", handleInteraction)

    return cleanup
  }, [])

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
        .select("full_name, role")
        .eq("id", authorId)
        .single()
      
      if (data?.full_name && data.full_name.trim() !== "") {
        return data.full_name
      }
      if (data?.role) {
        if (data.role === "standard_user") return "Staff Member"
        if (data.role === "super_admin" || data.role === "admin_full") return "Administrator"
        if (data.role === "admin_viewer") return "Viewer"
        if (data.role === "instructor") return "Instructor"
        if (data.role === "communications") return "Communications Team"
      }
      return "Team Member"
    }

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
          const isQuestion = payload.new.type === "question"
          const typeLabel = isQuestion && role === "standard_user"
            ? "Instructor Question"
            : TYPE_LABEL[payload.new.type] ?? "Issue"
          const href = IS_ADMIN(role)
            ? `/admin/courses/${payload.new.course_id}`
            : payload.new.type === "escalation"
              ? `/courses/${payload.new.course_id}`
              : `/courses/${payload.new.course_id}/issue-log`

          toast.warning(`${icon} New ${typeLabel}`, {
            description: (
              <div className="space-y-2">
                <p className="font-semibold">{payload.new.title}</p>
                <p className="text-xs text-muted-foreground">
                  Raised by {authorName} • {payload.new.severity} severity
                </p>
                <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                {payload.new.description && (
                  <p className="text-xs italic text-muted-foreground">&quot;{payload.new.description.substring(0, 100)}{payload.new.description.length > 100 ? "…" : ""}&quot;</p>
                )}
              </div>
            ),
            duration: Infinity,
            action: { label: "Open Issue", onClick: () => router.push(href) },
          })
          playNotificationTone("warning")
        }
      )
      .subscribe()

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
            : payload.new.type === "escalation"
              ? `/courses/${payload.new.course_id}`
              : `/courses/${payload.new.course_id}/issues`

          const statusMap: Record<string, { icon: string; label: string }> = {
            resolved: { icon: "✅", label: "Resolved" },
            in_review: { icon: "🔄", label: "In Review" },
            open: { icon: "↩️", label: "Reopened" },
          }

          const status = statusMap[payload.new.status] || { icon: "📌", label: "Updated" }

          if (payload.new.status === "resolved") {
            toast.success(`${status.icon} Issue ${status.label}`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: open → <span className="font-semibold text-success">resolved</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details", onClick: () => router.push(href) },
            })
            playNotificationTone("success")
          } else if (payload.new.status === "in_review") {
            toast.info(`${status.icon} Issue ${status.label}`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: <span className="text-warning">open</span> → <span className="font-semibold text-info">in review</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details", onClick: () => router.push(href) },
            })
            playNotificationTone("info")
          } else if (payload.new.status === "open") {
            toast.warning(`${status.icon} Issue ${status.label}`, {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{payload.new.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed: <span className="text-success">resolved</span> → <span className="font-semibold text-warning">open</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                </div>
              ),
              duration: Infinity,
              action: { label: "View Details", onClick: () => router.push(href) },
            })
            playNotificationTone("warning")
          }
        }
      )
      .subscribe()

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
            .select("course_id, title, type")
            .eq("id", payload.new.issue_id)
            .single()

          if (!issue) return

          const [courseTitle, authorName] = await Promise.all([
            getCourseCode(issue.course_id),
            getAuthorName(payload.new.author_id),
          ])

          const href = IS_ADMIN(role)
            ? `/admin/courses/${issue.course_id}`
            : issue.type === "escalation"
              ? `/courses/${issue.course_id}`
              : `/courses/${issue.course_id}/issues`

          const body: string = payload.new.body
          const preview = body.length > 100 ? `${body.substring(0, 100)}…` : body

          toast.info("💬 New Comment", {
            description: (
              <div className="space-y-2">
                <p className="font-semibold">{issue.title}</p>
                <p className="text-xs italic text-muted-foreground">&quot;{preview}&quot;</p>
                <p className="text-xs text-muted-foreground">By {authorName} on {courseTitle}</p>
              </div>
            ),
            duration: Infinity,
            action: { label: "Reply", onClick: () => router.push(href) },
          })
          playNotificationTone("info")
        }
      )
      .subscribe()

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
            description: `You were assigned \"${courseTitle}\". Open it when you are ready.`,
            duration: Infinity,
            action: {
              label: "Open Review",
              onClick: () => router.push(`/courses/${payload.new.course_id}/metadata`),
            },
          })
          playNotificationTone("success")
        }
      )
      .subscribe()

    const statusEventChannel = supabase
      .channel("public:course_status_events:insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_status_events" },
        async (payload) => {
          if (!dedup(`status-${payload.new.id}`)) return
          // Skip events the current user triggered themselves
          if (payload.new.actor_id === userId) return

          const toStatus: string = payload.new.to_status
          const courseId: string = payload.new.course_id

          // Determine relevance and message per role + target status
          type ToastSpec = {
            icon: string
            title: string
            description: string
            tone: "info" | "success" | "warning"
            href: string
            actionLabel: string
          }

          let spec: ToastSpec | null = null

          if (IS_ADMIN(role)) {
            if (toStatus === "submitted_to_admin") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "📋", title: "New Submission",
                description: `${courseTitle} is ready for your review.`,
                tone: "info",
                href: `/admin/courses/${courseId}`,
                actionLabel: "Review",
              }
            } else if (toStatus === "instructor_questions") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "❓", title: "Instructor Has Questions",
                description: `${courseTitle} — the instructor raised a question.`,
                tone: "warning",
                href: `/admin/courses/${courseId}`,
                actionLabel: "View",
              }
            } else if (toStatus === "instructor_viewing") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "👀", title: "Instructor Reviewing",
                description: `${courseTitle} — the instructor opened the review.`,
                tone: "info",
                href: `/admin/courses/${courseId}`,
                actionLabel: "View",
              }
            } else if (toStatus === "instructor_approved") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "✅", title: "Instructor Approved",
                description: `${courseTitle} — final approval is needed.`,
                tone: "success",
                href: `/admin/courses/${courseId}`,
                actionLabel: "Approve",
              }
            } else if (toStatus === "waiting_on_admin") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "🏗️", title: "Ready for Staging Shell",
                description: `${courseTitle} — review approved. Build the staging shell to continue.`,
                tone: "info",
                href: `/admin/courses/${courseId}`,
                actionLabel: "Build Shell",
              }
            }
          } else if (role === "standard_user") {
            // Only show if user is the TA for this course
            const { data: assignment } = await supabase
              .from("course_assignments")
              .select("id")
              .eq("course_id", courseId)
              .eq("profile_id", userId)
              .maybeSingle()
            if (!assignment) return

            if (toStatus === "admin_changes_requested") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "⚠️", title: "Changes Requested",
                description: `${courseTitle} — an admin has requested changes.`,
                tone: "warning",
                href: `/courses/${courseId}/submit`,
                actionLabel: "View Feedback",
              }
            } else if (toStatus === "waiting_on_admin") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "🎉", title: "Review Approved — Staging Next",
                description: `${courseTitle} — approved by admin, who is now building the staging shell.`,
                tone: "success",
                href: `/courses/${courseId}/metadata`,
                actionLabel: "View",
              }
            } else if (toStatus === "staging_in_progress") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "🛠️", title: "Ready to Finalize",
                description: `${courseTitle} — the staging shell is ready. Finalize the course to send it on.`,
                tone: "info",
                href: `/courses/${courseId}/metadata`,
                actionLabel: "Finalize & Send",
              }
            }
          } else if (role === "instructor") {
            if (toStatus === "sent_to_instructor") {
              const courseTitle = await getCourseCode(courseId)
              spec = {
                icon: "📬", title: "Course Ready for Review",
                description: `${courseTitle} is ready for your review.`,
                tone: "info",
                href: `/instructor/courses/${courseId}`,
                actionLabel: "Open",
              }
            }
          }

          if (!spec) return

          const { icon, title, description, tone, href, actionLabel } = spec
          if (tone === "success") {
            toast.success(`${icon} ${title}`, {
              description,
              duration: Infinity,
              action: { label: actionLabel, onClick: () => router.push(href) },
            })
          } else if (tone === "warning") {
            toast.warning(`${icon} ${title}`, {
              description,
              duration: Infinity,
              action: { label: actionLabel, onClick: () => router.push(href) },
            })
          } else {
            toast.info(`${icon} ${title}`, {
              description,
              duration: Infinity,
              action: { label: actionLabel, onClick: () => router.push(href) },
            })
          }
          playNotificationTone(tone)
          router.refresh()
        }
      )
      .subscribe()

    const supportMessageChannel = role === "super_admin"
      ? supabase
        .channel("public:support_messages:insert")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages" },
          async (payload) => {
            if (!dedup("support-" + payload.new.id)) return

            const senderName = await getAuthorName(payload.new.sender_profile_id)
            const isPoke = payload.new.type === "poke"
            const title = isPoke ? "IT Support Poke" : (payload.new.subject || "New Support Message")
            const body = String(payload.new.body || "")
            const preview = body.length > 100 ? body.substring(0, 100) + "..." : body

            toast.warning(isPoke ? "⚡ IT Support Poke" : "💬 Support Message", {
              description: (
                <div className="space-y-2">
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">From {senderName}</p>
                  {preview && <p className="text-xs italic text-muted-foreground">&quot;{preview}&quot;</p>}
                </div>
              ),
              duration: Infinity,
              action: { label: "Open", onClick: () => router.push("/notifications") },
            })
            playNotificationTone("warning")
            router.refresh()
          }
        )
        .subscribe()
      : null

    return () => {
      supabase.removeChannel(issueInsertChannel)
      supabase.removeChannel(issueUpdateChannel)
      supabase.removeChannel(commentChannel)
      supabase.removeChannel(assignmentChannel)
      supabase.removeChannel(statusEventChannel)
      if (supportMessageChannel) supabase.removeChannel(supportMessageChannel)
    }
  }, [userId, role, router])

  return <>{children}</>
}
