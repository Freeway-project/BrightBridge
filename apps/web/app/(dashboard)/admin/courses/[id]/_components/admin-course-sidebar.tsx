"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminCourseRow } from "@/lib/admin/queries"
import { approveReviewAction, requestFixesAction } from "../../../actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, MessageSquare, AlertCircle, Clock, User } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Separator } from "@/components/ui/separator"

interface Props {
  course: AdminCourseRow
}

export function AdminCourseSidebar({ course }: Props) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      await approveReviewAction(course.id)
      router.push("/admin")
    })
  }

  function handleSendFixes() {
    startTransition(async () => {
      await requestFixesAction(course.id, note)
      router.push("/admin")
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      {/* Course Summary */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
          <StatusBadge status={course.status} />
        </div>
        
        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            <span className="font-medium">TA:</span>
            <span className="text-muted-foreground">
              {course.ta?.name ?? course.ta?.email ?? "Unassigned"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span className="font-medium">Last Updated:</span>
            <span className="text-muted-foreground">
              {new Date(course.updatedAt).toLocaleDateString()}
            </span>
          </div>
          {course.department && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-4 text-muted-foreground" />
              <span className="font-medium">Dept:</span>
              <span className="text-muted-foreground">{course.department}</span>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Admin Actions */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Actions</h3>
        
        {!fixesOpen ? (
          <div className="flex flex-col gap-2">
            <Button 
              className="w-full justify-start" 
              disabled={isPending || course.status !== "submitted_to_admin"} 
              onClick={handleApprove}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Approve Course
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20" 
              disabled={isPending || course.status !== "submitted_to_admin"} 
              onClick={() => setFixesOpen(true)}
            >
              <MessageSquare className="mr-2 size-4" />
              Request Fixes
            </Button>
            {course.status !== "submitted_to_admin" && (
              <p className="text-[10px] text-muted-foreground italic">
                Actions available once TA submits review.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/10">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Note for TA</p>
            <Textarea
              autoFocus
              placeholder="What needs fixing?"
              className="bg-background min-h-[100px] text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="flex-1" disabled={isPending} onClick={handleSendFixes}>
                Send
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" disabled={isPending} onClick={() => { setFixesOpen(false); setNote("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
