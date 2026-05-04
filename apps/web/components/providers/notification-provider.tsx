"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Role } from "@coursebridge/workflow"

interface NotificationProviderProps {
  children: React.ReactNode
  userId: string
  role: Role
}

export function NotificationProvider({ children, userId, role }: NotificationProviderProps) {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    // 1. Listen for new or updated escalations (Notify Admins on Insert, TAs on Resolve)
    const escalationChannel = supabase
      .channel('public:escalations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'escalations' },
        (payload) => {
          if (role === 'admin_full' || role === 'super_admin') {
            toast.error("New Escalation", {
              description: `${payload.new.title}`,
              action: {
                label: "View",
                onClick: () => router.push(`/admin/courses/${payload.new.course_id}`)
              },
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'escalations' },
        (payload) => {
          // If status changed to resolved, notify TA
          if (payload.old.status !== 'resolved' && payload.new.status === 'resolved') {
            if (role === 'standard_user') {
              toast.success("Escalation Resolved", {
                description: `Admin resolved: ${payload.new.title}`,
                action: {
                  label: "View",
                  onClick: () => router.push(`/courses/${payload.new.course_id}/issue-log`)
                },
              })
            }
          }
        }
      )
      .subscribe()

    // 2. Listen for new escalation messages (Notify TAs or Admins)
    const messageChannel = supabase
      .channel('public:escalation_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'escalation_messages' },
        async (payload) => {
          // Don't notify if I'm the author
          if (payload.new.author_id === userId) return

          // We need the escalation details to know which course this is for
          const { data: escalation } = await supabase
            .from('escalations')
            .select('course_id, title')
            .eq('id', payload.new.escalation_id)
            .single()

          if (escalation) {
            const isTargetAdmin = role === 'admin_full' || role === 'super_admin'
            const isTargetTA = role === 'standard_user'

            // For now, keep it simple: notify based on role
            // In a more complex setup, we'd check if the user is assigned to the course
            
            const title = "New Reply"
            const description = payload.new.body.length > 60 
              ? `${payload.new.body.substring(0, 60)}...` 
              : payload.new.body

            const href = isTargetAdmin 
              ? `/admin/courses/${escalation.course_id}`
              : `/courses/${escalation.course_id}/issue-log`

            toast.info(title, {
              description: description,
              action: {
                label: "View",
                onClick: () => router.push(href)
              },
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(escalationChannel)
      supabase.removeChannel(messageChannel)
    }
  }, [supabase, userId, role, router])

  return <>{children}</>
}
