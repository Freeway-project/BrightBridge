"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, MessageCircleQuestion } from "lucide-react"
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
import { instructorRaiseQuestionAction } from "../actions"
import { InstructorSignOffDialog } from "./instructor-signoff-dialog"

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
}

export function InstructorCourseActions({ courseId, status, finalSummary }: Props) {
  const [isPending, startTransition] = useTransition()
  const [questionOpen, setQuestionOpen] = useState(false)
  const [signOffOpen, setSignOffOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  if (status !== "sent_to_instructor" && status !== "instructor_viewing") return null

  const submitQuestion = () => {
    if (!title.trim()) return
    startTransition(async () => {
      await instructorRaiseQuestionAction(courseId, title, description)
      setQuestionOpen(false)
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
          className="h-9 gap-1.5"
          disabled={isPending}
          onClick={() => setQuestionOpen(true)}
        >
          <MessageCircleQuestion className="size-4" />
          I have a question — speak to TA
        </Button>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          disabled={isPending}
          onClick={() => setSignOffOpen(true)}
        >
          <CheckCircle2 className="size-4" />
          Sign off — all good
        </Button>
      </div>

      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask the TA a question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Question <span className="text-destructive">*</span></p>
              <Input
                placeholder="What would you like to ask?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Details <span className="text-xs">(optional)</span></p>
              <Textarea
                placeholder="Add any helpful context…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuestionOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={submitQuestion} disabled={isPending || !title.trim()}>
              {isPending ? "Sending…" : "Send to TA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InstructorSignOffDialog
        courseId={courseId}
        finalSummary={finalSummary}
        open={signOffOpen}
        onOpenChange={setSignOffOpen}
      />
    </>
  )
}
