"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/courses/status-badge"
import { PaginationControls } from "@/components/shared/pagination-controls"
import type { PaginatedResult, SuperAdminCourseRow as CourseRow } from "@/lib/repositories/contracts"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CoursesView({ result, search }: { result: PaginatedResult<CourseRow>, search: string }) {
  const { data: courses, total, page, totalPages } = result

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col bg-background">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{total} courses</p>
        <form method="GET" action="/super-admin/courses" className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search by title, status…"
            className="pl-8 h-8 text-sm"
            defaultValue={search}
          />
        </form>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs pl-4">Title</TableHead>
              <TableHead className="text-xs w-[200px]">Status</TableHead>
              <TableHead className="text-xs">Staff</TableHead>
              <TableHead className="text-xs">Instructor</TableHead>
              <TableHead className="text-xs w-[110px]">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No courses found.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="pl-4 text-sm font-medium truncate max-w-[300px]">{c.title}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-xs">{c.ta?.name ?? c.ta?.email ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.instructor?.name ?? c.instructor?.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(c.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} totalItems={total} />
    </div>
  )
}
