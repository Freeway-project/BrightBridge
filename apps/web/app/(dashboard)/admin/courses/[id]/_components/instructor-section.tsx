"use client"

import { useState } from "react"
import { UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProfileOption } from "@/lib/repositories/contracts"
import { ChangeInstructorDialog } from "./change-instructor-dialog"

type CurrentInstructor = { id: string; name: string | null; email: string } | null

type Props = {
  courseId: string
  current: CurrentInstructor
  instructors: ProfileOption[]
}

export function InstructorSection({ courseId, current, instructors }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Instructor</p>
        {current ? (
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {current.name ?? current.email}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{current.email}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No instructor assigned</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="shrink-0">
        <UserCog className="mr-2 size-4" />
        {current ? "Change" : "Assign"}
      </Button>
      <ChangeInstructorDialog
        open={open}
        onOpenChange={setOpen}
        courseId={courseId}
        current={current}
        instructors={instructors}
      />
    </div>
  )
}
