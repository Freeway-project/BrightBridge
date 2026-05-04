"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Role } from "@coursebridge/workflow"

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
const IS_ADMIN = (role: Role) => role === "admin_full" || role === "super_admin"

interface NotificationProviderProps {
  children: React.ReactNode
  userId: string
  role: Role
}

export function NotificationProvider({ children, userId, role }: NotificationProviderProps) {
  const supabase = createClient()
  const router = useRouter()
  // Tracks IDs already surfaced (via realtime or polling) to prevent duplicate toasts
  const seenEscalationIds = useRef(new Set<string>())
  // Tracks the timestamp from which the next poll should look for new escalations
  const lastPolledAt = useRef(new Date().toISOString())

  useEffect(() => {
    if (!userId) return

    function showEscalationToast(id: string, title: string, courseId: string) {
      if (seenEscalationIds.current.has(id)) return
      seenEscalationIds.current.add(id)
      toast.error("New Escalation", {
        description: title,
        action: {
          label: "View",
          onClick: () => router.push(`/admin/courses/${courseId}`),
        },
      })
    }

    // 1. Realtime: new escalations → admins
    const escalationChannel = supabase
      .channel("public:course_escalations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_escalations" },
        (payload) => {
          if (IS_ADMIN(role)) {
            showEscalationToast(payload.new.id, payload.new.title, payload.new.course_id)
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "course_escalations" },
        (payload) => {
          if (payload.old.status !== "resolved" && payload.new.status === "resolved") {
            if (role === "standard_user") {
              toast.success("Escalation Resolved", {
                description: `Admin resolved: ${payload.new.title}`,
                action: {
                  label: "View",
                  onClick: () => router.push(`/courses/${payload.new.course_id}/issue-log`),
                },
              })
            }
          }
        }
      )
      .subscribe()

    // 2. Realtime: new messages in escalation threads
    const messageChannel = supabase
      .channel("public:escalation_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "escalation_messages" },
        async (payload) => {
          if (payload.new.author_id === userId) return

          const { data: escalation } = await supabase
            .from("course_escalations")
            .select("course_id, title")
            .eq("id", payload.new.escalation_id)
            .single()

          if (!escalation) return

          const href = IS_ADMIN(role)
            ? `/admin/courses/${escalation.course_id}`
            : `/courses/${escalation.course_id}/issue-log`

          const body: string = payload.new.body
          toast.info("New Reply", {
            description: body.length > 60 ? `${body.substring(0, 60)}…` : body,
            action: { label: "View", onClick: () => router.push(href) },
            duration: 7000,
          })
        }
      )
      .subscribe()

    // 3. Realtime: new course assignments → TAs
    const assignmentChannel = supabase
      .channel("public:course_assignments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_assignments" },
        async (payload) => {
          if (payload.new.profile_id === userId && payload.new.role === "staff") {
            const { data: course } = await supabase
              .from("courses")
              .select("title")
              .eq("id", payload.new.course_id)
              .single()

            if (course) {
              toast.success("New Course Assigned", {
                description: course.title,
                action: {
                  label: "View",
                  onClick: () => router.push(`/courses/${payload.new.course_id}`),
                },
                duration: 10000,
              })
            }
          }
        }
      )
      .subscribe()

    // 3. Polling fallback for admins — catches new escalations if realtime drops
    let pollTimer: ReturnType<typeof setInterval> | null = null

    if (IS_ADMIN(role)) {
      pollTimer = setInterval(async () => {
        const since = lastPolledAt.current
        lastPolledAt.current = new Date().toISOString()

        const { data } = await supabase
          .from("course_escalations")
          .select("id, title, course_id")
          .eq("status", "open")
          .gt("created_at", since)
          .order("created_at", { ascending: true })

        if (!data) return
        for (const esc of data) {
          showEscalationToast(esc.id, esc.title, esc.course_id)
        }
      }, POLL_INTERVAL_MS)
    }

    return () => {
      supabase.removeChannel(escalationChannel)
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(assignmentChannel)
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [supabase, userId, role, router])

  return <>{children}</>
}
