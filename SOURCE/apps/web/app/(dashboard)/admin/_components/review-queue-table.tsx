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
    <Card className="border-border-icy bg-white/[0.02] shadow-xl overflow-hidden">
      <CardHeader className="border-b border-border-icy bg-white/[0.02]">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">
          Pending Reviews
          <span className="ml-3 text-[10px] font-bold text-muted-foreground/50">({courses.length} active)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-background/40">
            <TableRow className="hover:bg-transparent border-b border-border-icy">
              <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Course Reference</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Assigned TA</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Handoff Date</TableHead>
              <TableHead className="pr-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell className="py-16 text-center" colSpan={4}>
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <CheckCircle2 className="size-8 text-primary/40" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Queue clear</p>
                  </div>
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
        className="cursor-pointer group/row transition-all hover:bg-primary/[0.03] border-b border-border-icy/50"
        onClick={onRowClick}
      >
        <TableCell className="pl-6 py-4">
          <p className="text-sm font-black text-foreground group-hover/row:text-primary transition-colors">{course.title}</p>
          {course.sourceCourseId && (
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">{course.sourceCourseId}</p>
          )}
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
             <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black text-primary">
                {course.ta?.name?.[0] ?? "?"}
             </div>
             <div className="flex flex-col">
                <p className="text-xs font-bold text-foreground/80 leading-none">{course.ta?.name ?? "—"}</p>
                <p className="text-[9px] font-medium text-muted-foreground/40 mt-1 uppercase tracking-tighter">{course.ta?.email}</p>
             </div>
          </div>
        </TableCell>
        <TableCell className="text-[11px] font-bold text-muted-foreground/60 uppercase py-4">
          {new Date(course.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </TableCell>
        <TableCell className="pr-6 text-right py-4">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="xs"
              className="h-8 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/5 transition-all hover:scale-105"
              disabled={isPending}
              onClick={handleApprove}
            >
              Approve
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="h-8 font-black uppercase tracking-widest text-[9px] border-border-icy bg-white/5 hover:bg-white/10 transition-all"
              disabled={isPending}
              onClick={handleRequestFixes}
            >
              Request Fixes
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {fixesOpen && (
        <TableRow>
          <TableCell colSpan={4} className="bg-warning/[0.03] border-b border-warning/10 px-6 pb-6 pt-2">
            <div className="space-y-3 animate-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-widest text-warning/70">Adjustment Notes for TA</p>
              <Textarea
                autoFocus
                className="text-xs font-medium bg-background/50 border-border-icy focus:border-warning/50 rounded-xl min-h-[80px]"
                placeholder="Describe the requested changes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" className="h-8 text-[10px] font-black uppercase tracking-widest" disabled={isPending} onClick={handleRequestFixes}>
                  {isPending ? "Sending..." : "Submit Fix Request"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] font-bold uppercase"
                  onClick={(e) => { e.stopPropagation(); setFixesOpen(false); setNote("") }}
                >
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
