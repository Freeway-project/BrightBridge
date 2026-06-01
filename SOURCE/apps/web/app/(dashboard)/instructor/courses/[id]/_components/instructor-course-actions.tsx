"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CourseStatus } from "@coursebridge/workflow"
import { instructorApproveAction, instructorRaiseQuestionAction } from "../actions"

interface Props {
  courseId: string
  status: CourseStatus
}

export function InstructorCourseActions({ courseId, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  if (status !== "sent_to_instructor") return null

  const handleRaiseQuestion = () => {
    if (!title.trim()) return
    startTransition(async () => {
      await instructorRaiseQuestionAction(courseId, title, description)
      setDialogOpen(false)
      setTitle("")
      setDescription("")
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 pb-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
        >
          <HelpCircle className="size-3.5" />
          Raise a Question
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
          disabled={isPending}
          onClick={() => startTransition(() => instructorApproveAction(courseId))}
        >
          <CheckCircle2 className="size-3.5" />
          {isPending ? "Saving…" : "Approve Course"}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise a Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Question <span className="text-destructive">*</span></p>
              <Input
                placeholder="What is your question?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Details <span className="text-xs">(optional)</span></p>
              <Textarea
                placeholder="Add context, location in the course, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRaiseQuestion}
              disabled={!title.trim() || isPending}
            >
              {isPending ? "Submitting…" : "Submit Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
