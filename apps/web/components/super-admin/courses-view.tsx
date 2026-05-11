"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/courses/status-badge"
import { PaginationControls } from "@/components/shared/pagination-controls"
import type { PaginatedResult, SuperAdminCourseRow as CourseRow } from "@/lib/repositories/contracts"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CoursesView({ result, search }: { result: PaginatedResult<CourseRow>, search: string }) {
  const { data: courses, total, page, totalPages } = result

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="shrink-0 text-sm font-semibold text-foreground">{total} total courses</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">SUMMARY</span>
        </div>
        <form method="GET" action="/super-admin/courses" className="relative min-w-0 w-full sm:w-64 sm:shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search courses..."
            className="pl-8 h-8 text-sm rounded-full"
            defaultValue={search}
          />
        </form>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/30">
              <TableHead className="text-[11px] uppercase tracking-wider font-bold pl-6">Course Information</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold w-[180px]">Workflow Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold">Assigned Staff</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold hidden md:table-cell">Instructor</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold w-[100px] text-right pr-6">Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground italic">
                  No courses match your criteria.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c, idx) => {
                const isProblem = c.status === "admin_changes_requested" || c.status === "instructor_questions"
                const borderClass = 
                  c.status === "instructor_approved" || c.status === "final_approved" ? "border-l-success" :
                  isProblem ? "border-l-warning" :
                  c.status === "submitted_to_admin" || c.status === "sent_to_instructor" ? "border-l-primary" :
                  "border-l-muted-foreground/20"

                // Alternating pattern: 96% (card) vs 94% (secondary)
                const bgClass = idx % 2 === 0 ? "bg-card" : "bg-secondary/50"

                return (
                  <TableRow 
                    key={c.id} 
                    className={cn(
                      "group border-b border-border transition-colors hover:bg-primary/5 border-l-[3px]",
                      borderClass,
                      bgClass
                    )}
                  >
                    <TableCell className="max-w-[20rem] whitespace-normal break-words pl-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{c.title}</span>
                        <span className="text-[11px] text-muted-foreground font-medium tracking-tight">{c.id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="max-w-[12rem] whitespace-normal break-words text-xs font-semibold text-foreground/80">
                      {c.ta?.name ?? c.ta?.email ?? <span className="text-muted-foreground/50 italic text-[11px]">Unassigned</span>}
                    </TableCell>
                    <TableCell className="max-w-[12rem] whitespace-normal break-words text-xs font-medium text-muted-foreground hidden md:table-cell">
                      {c.instructor?.name ?? c.instructor?.email ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal text-[11px] text-right pr-6 font-bold text-muted-foreground/70">
                      {fmt(c.updated_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} totalItems={total} />
    </div>
  )
}
