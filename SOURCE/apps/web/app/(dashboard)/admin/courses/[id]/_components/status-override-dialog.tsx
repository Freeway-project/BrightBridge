"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  type CourseStatus,
} from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { overrideCourseStatusAction } from "../actions"

interface Props {
  courseId: string
  courseTitle: string
  currentStatus: CourseStatus
}

const MIN_REASON = 10

export function StatusOverrideDialog({ courseId, courseTitle, currentStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<CourseStatus | "">("")
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const reasonOk = reason.trim().length >= MIN_REASON
  const canSubmit = target !== "" && target !== currentStatus && reasonOk && !isPending

  function reset() {
    setTarget("")
    setReason("")
  }

  function onConfirm() {
    if (!canSubmit) return
    startTransition(async () => {
      try {
        await overrideCourseStatusAction({
          courseId,
          to: target as CourseStatus,
          reason: reason.trim(),
        })
        toast.success(`Moved to ${COURSE_STATUS_LABELS[target as CourseStatus]}`)
        setOpen(false)
        reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Override failed")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">Change status…</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move &quot;{courseTitle}&quot; from {COURSE_STATUS_LABELS[currentStatus]} to{" "}
            {target ? COURSE_STATUS_LABELS[target as CourseStatus] : "…"}?
          </DialogTitle>
          <DialogDescription>
            This is an admin override. It is recorded in the audit trail with your name and the reason below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New status</label>
            <Select value={target || undefined} onValueChange={(v) => setTarget(v as CourseStatus)}>
              <SelectTrigger><SelectValue placeholder="Pick a status…" /></SelectTrigger>
              <SelectContent>
                {COURSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} disabled={s === currentStatus}>
                    {COURSE_STATUS_LABELS[s]}{s === currentStatus ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Reason (required, min {MIN_REASON} chars)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this status change needed?"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">Recorded in the audit trail.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!canSubmit}>
            {isPending ? "Saving…" : "Confirm override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
