"use client"

import { FileDown, FileSpreadsheet, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  // Carry the current filter into the bulk exports so they match the table view.
  const exportQuery = search ? `?search=${encodeURIComponent(search)}` : ""

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="shrink-0 text-sm text-muted-foreground">{total} courses</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <a href={`/api/super-admin/courses/export${exportQuery}`}>
                <FileSpreadsheet className="size-3.5" />
                Export All (Excel)
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <a href={`/print/courses${exportQuery}`} target="_blank" rel="noopener noreferrer">
                <FileDown className="size-3.5" />
                Export All (PDF)
              </a>
            </Button>
          </div>
          <form method="GET" action="/super-admin/courses" className="relative min-w-0 w-full sm:w-64 sm:shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search by title, status…"
              className="pl-8 h-8 text-sm"
              defaultValue={search}
            />
          </form>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs pl-4">Title</TableHead>
              <TableHead className="text-xs w-[200px]">Status</TableHead>
              <TableHead className="text-xs">Staff</TableHead>
              <TableHead className="text-xs">Instructor</TableHead>
              <TableHead className="text-xs w-[110px]">Last Updated</TableHead>
              <TableHead className="text-xs w-[200px] text-right pr-4">Export</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No courses found.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="max-w-[min(20rem,100%)] whitespace-normal break-words pl-4 text-sm font-medium">{c.title}</TableCell>
                  <TableCell className="align-top"><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="max-w-[12rem] whitespace-normal break-words text-xs sm:max-w-none">{c.ta?.name ?? c.ta?.email ?? "—"}</TableCell>
                  <TableCell className="max-w-[12rem] whitespace-normal break-words text-xs sm:max-w-none">{c.instructor?.name ?? c.instructor?.email ?? "—"}</TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">{fmt(c.updated_at)}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        <a href={`/api/courses/${c.id}/xlsx`}>
                          <FileSpreadsheet className="size-3.5" />
                          Excel
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        <a href={`/print/courses/${c.id}`} target="_blank" rel="noopener noreferrer">
                          <FileDown className="size-3.5" />
                          PDF
                        </a>
                      </Button>
                    </div>
                  </TableCell>
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
