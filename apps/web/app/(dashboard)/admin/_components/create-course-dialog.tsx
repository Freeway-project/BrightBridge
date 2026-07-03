"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BookPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
      <DialogContent className="overflow-hidden p-0 gap-0">
        {/* Coloured header band */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--ev-600)] to-[var(--accent-indigo)] px-6 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner">
            <BookPlus className="size-5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Add course</h2>
            <p className="text-xs text-white/70">
              Starts in <span className="font-medium text-white/90">Course Created</span> status
            </p>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="space-y-5 p-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="title">
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

          {/* Course IDs */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Course IDs</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="sourceCourseId">
                  Source ID
                </label>
                <Input
                  id="sourceCourseId"
                  name="sourceCourseId"
                  placeholder="e.g. PSYC-101"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="targetCourseId">
                  Target ID
                </label>
                <Input
                  id="targetCourseId"
                  name="targetCourseId"
                  placeholder="e.g. PSYC-101-2026"
                />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="term">
                  Term
                </label>
                <Input
                  id="term"
                  name="term"
                  placeholder="e.g. Fall 2026"
                />
              </div>
              <div className="space-y-1.5">
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
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[var(--ev-600)] hover:bg-[var(--ev-500)] text-white"
            >
              {pending ? "Creating…" : "Create course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
