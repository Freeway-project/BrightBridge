"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminCourseRow } from "@/lib/admin/queries"
import { approveReviewAction, requestFixesAction } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, MessageSquare, X } from "lucide-react"

type Props = { courses: AdminCourseRow[] }

export function ReviewQueueTable({ courses }: Props) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Submitted for Review
          <span className="ml-2 text-sm font-normal text-muted-foreground">({courses.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs">Course</TableHead>
              <TableHead className="text-xs">TA</TableHead>
              <TableHead className="text-xs">Submitted</TableHead>
              <TableHead className="pr-4 text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                  No submissions waiting for review.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <QueueRow
                  key={course.id}
                  course={course}
                  onRowClick={() => router.push(`/admin/courses/${course.id}`)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function QueueRow({ course, onRowClick }: { course: AdminCourseRow; onRowClick: () => void }) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleApprove(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(() => approveReviewAction(course.id))
  }

  function handleRequestFixes(e: React.MouseEvent) {
    e.stopPropagation()
    if (!fixesOpen) {
      setFixesOpen(true)
      return
    }
    startTransition(() => requestFixesAction(course.id, note))
  }

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onRowClick}
      >
        <TableCell className="pl-4">
          <p className="text-sm font-medium">{course.title}</p>
          {course.sourceCourseId && (
            <p className="text-xs text-muted-foreground">{course.sourceCourseId}</p>
          )}
        </TableCell>
        <TableCell>
          <p className="text-sm">{course.ta?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{course.ta?.email}</p>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {new Date(course.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </TableCell>
        <TableCell className="pr-4 text-right">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleApprove}
            >
              <CheckCircle2 className="mr-1.5 size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleRequestFixes}
            >
              <MessageSquare className="mr-1.5 size-3.5" />
              Request Fixes
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {fixesOpen && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 px-4 pb-4 pt-2">
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-medium text-foreground">Note for TA (optional)</p>
              <Textarea
                autoFocus
                className="text-sm"
                placeholder="Describe what needs to be fixed..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" disabled={isPending} onClick={handleRequestFixes}>
                  {isPending ? "Sending..." : "Send Request"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setFixesOpen(false); setNote("") }}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
