"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createCourseAction, type CreateCourseState } from "../actions"

const initialState: CreateCourseState = { kind: "idle", message: null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createCourseAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const lastHandled = useRef<CreateCourseState | null>(null)

  useEffect(() => {
    if (state === lastHandled.current) return
    if (state.kind === "success") {
      lastHandled.current = state
      toast.success(state.message ?? "Course created.")
      router.refresh()
      onOpenChange(false)
    } else if (state.kind === "error") {
      lastHandled.current = state
      toast.error(state.message ?? "Failed to create course.")
    }
  }, [state, router, onOpenChange])

  useEffect(() => {
    if (open) {
      lastHandled.current = null
      formRef.current?.reset()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add course</DialogTitle>
          <DialogDescription>
            Manually create a new course record. It will start in the{" "}
            <span className="font-medium">Course Created</span> status.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="title">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Introduction to Psychology"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sourceCourseId">
                Source course ID
              </label>
              <Input
                id="sourceCourseId"
                name="sourceCourseId"
                placeholder="e.g. PSYC-101"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="targetCourseId">
                Target course ID
              </label>
              <Input
                id="targetCourseId"
                name="targetCourseId"
                placeholder="e.g. PSYC-101-2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="term">
                Term
              </label>
              <Input
                id="term"
                name="term"
                placeholder="e.g. Fall 2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="department">
                Department
              </label>
              <Input
                id="department"
                name="department"
                placeholder="e.g. Psychology"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
