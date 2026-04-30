"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/courses/status-badge"
import type { SuperAdminData } from "@/lib/super-admin/queries"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CoursesView({ data }: { data: SuperAdminData }) {
  const { courses } = data
  const [courseSearch, setCourseSearch] = useState("")

  const filteredCourses = courses.filter(
    (c) =>
      courseSearch.trim() === "" ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.status.toLowerCase().includes(courseSearch.toLowerCase()) ||
      (c.ta?.name ?? "").toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filteredCourses.length} courses</p>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by title, status, staff…"
            className="pl-8 h-8 text-sm"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
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
            {filteredCourses.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="pl-4 text-sm font-medium truncate max-w-[300px]">{c.title}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-xs">{c.ta?.name ?? c.ta?.email ?? "—"}</TableCell>
                <TableCell className="text-xs">{c.instructor?.name ?? c.instructor?.email ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmt(c.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
