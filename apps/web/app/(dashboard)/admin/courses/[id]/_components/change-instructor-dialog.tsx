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
import { changeCourseInstructorAction, type AssignTaState } from "../../../actions"

const initialState: AssignTaState = { kind: "idle", message: null }

type CurrentInstructor = { id: string; name: string | null; email: string } | null
type Mode = "existing" | "new"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  current: CurrentInstructor
  instructors: ProfileOption[]
}

export function ChangeInstructorDialog({ open, onOpenChange, courseId, current, instructors }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(changeCourseInstructorAction, initialState)
  const [mode, setMode] = useState<Mode>("existing")
  const [profileId, setProfileId] = useState("")
  const [search, setSearch] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const lastHandled = useRef<AssignTaState | null>(null)

  // Existing-instructor options, minus whoever is already assigned, filtered by search.
  const normalizedSearch = search.trim().toLowerCase()
  const visibleInstructors = useMemo(
    () =>
      instructors.filter(
        (i) =>
          i.id !== current?.id &&
          (!normalizedSearch ||
            (i.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
            i.email.toLowerCase().includes(normalizedSearch)),
      ),
    [instructors, current, normalizedSearch],
  )

  // Surface result + close on success.
  useEffect(() => {
    if (state === lastHandled.current) return
    if (state.kind === "success") {
      lastHandled.current = state
      toast.success(state.message ?? "Instructor updated.")
      router.refresh()
      onOpenChange(false)
    } else if (state.kind === "error") {
      lastHandled.current = state
      toast.error(state.message ?? "Could not update instructor.")
    }
  }, [state, router, onOpenChange])

  // Reset selection when reopened.
  useEffect(() => {
    if (open) {
      setMode("existing")
      setProfileId("")
      setSearch("")
      setFullName("")
      setEmail("")
    }
  }, [open])

  const canSubmit =
    !pending &&
    (mode === "existing" ? Boolean(profileId) : Boolean(fullName.trim()) && Boolean(email.trim()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{current ? "Change instructor" : "Assign instructor"}</DialogTitle>
          <DialogDescription>
            {current
              ? `Replaces the current instructor (${current.name ?? current.email}). The change is recorded in the course log.`
              : "Assign this course's instructor. The assignment is recorded in the course log."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "existing" ? "default" : "outline"}
            onClick={() => setMode("existing")}
          >
            Existing instructor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "new" ? "default" : "outline"}
            onClick={() => setMode("new")}
          >
            New instructor
          </Button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="mode" value={mode} />

          {mode === "existing" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructor</label>
              <Input
                placeholder="Search instructors by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select name="profileId" value={profileId} onValueChange={setProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent>
                  {visibleInstructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.fullName ?? i.email} ({i.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full name</label>
                <Input
                  name="fullName"
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  placeholder="jane.doe@example.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea name="reason" placeholder="Why is the instructor changing?" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Saving…" : current ? "Change instructor" : "Assign instructor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
