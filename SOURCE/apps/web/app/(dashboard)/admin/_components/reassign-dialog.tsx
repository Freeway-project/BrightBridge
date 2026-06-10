"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { ProfileOption } from "@/lib/repositories/contracts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { batchReassignCourseAction, type AssignTaState } from "../actions"

const initialState: AssignTaState = { kind: "idle", message: null }

export type ReassignTarget = { id: string; title: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courses: ReassignTarget[]
  tas: ProfileOption[]
  onDone?: (courseIds: string[]) => void
}

export function ReassignDialog({ open, onOpenChange, courses, tas, onDone }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(batchReassignCourseAction, initialState)
  const [taId, setTaId] = useState("")
  const [taSearch, setTaSearch] = useState("")
  const lastHandled = useRef<AssignTaState | null>(null)

  const courseIds = useMemo(() => courses.map((c) => c.id).join(","), [courses])
  const normalizedSearch = taSearch.trim().toLowerCase()
  const visibleTas = useMemo(
    () =>
      tas.filter((t) =>
        !normalizedSearch ||
        (t.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
        t.email.toLowerCase().includes(normalizedSearch),
      ),
    [tas, normalizedSearch],
  )

  // Surface result + close on success.
  useEffect(() => {
    if (state === lastHandled.current) return
    if (state.kind === "success") {
      lastHandled.current = state
      toast.success(state.message ?? "Courses reassigned.")
      router.refresh()
      const failed = state.results?.filter((r) => !r.success) ?? []
      const succeededIds = state.results
        ? state.results.filter((r) => r.success).map((r) => r.courseId)
        : courses.map((c) => c.id)
      onDone?.(succeededIds)
      if (failed.length === 0) {
        onOpenChange(false)
      }
    } else if (state.kind === "error") {
      lastHandled.current = state
      toast.error(state.message ?? "Reassignment failed.")
    }
  }, [state, router, onDone, onOpenChange, courses])

  // Reset selection when reopened.
  useEffect(() => {
    if (open) {
      setTaId("")
      setTaSearch("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign {courses.length === 1 ? "course" : `${courses.length} courses`}</DialogTitle>
          <DialogDescription>
            Move {courses.length === 1 ? "this course" : "these courses"} to a different TA. The
            current TA loses access and the new TA is notified.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="courseIds" value={courseIds} />

          <div className="space-y-2">
            <label className="text-sm font-medium">New TA</label>
            <Input
              placeholder="Search TAs by name or email"
              value={taSearch}
              onChange={(e) => setTaSearch(e.target.value)}
            />
            <Select name="profileId" value={taId} onValueChange={setTaId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a TA" />
              </SelectTrigger>
              <SelectContent>
                {visibleTas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName ?? t.email} ({t.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea name="reason" placeholder="Why is this being reassigned?" rows={3} />
          </div>

          {state.results?.some((r) => !r.success) && (
            <ul className="max-h-32 space-y-1 overflow-auto text-xs">
              {state.results.filter((r) => !r.success).map((r) => (
                <li key={r.courseId} className="text-destructive">
                  {r.title}: {r.message}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !taId || courses.length === 0}>
              {pending ? "Reassigning…" : "Reassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
