"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

interface CourseFilterBarProps {
  onSearch: (query: string) => void
}

export function CourseFilterBar({ onSearch }: CourseFilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          className="pl-8 h-8 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <Select>
        <SelectTrigger className="h-8 w-[130px] text-sm">
          <SelectValue placeholder="All terms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fall-2025">Fall 2025</SelectItem>
          <SelectItem value="spring-2025">Spring 2025</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="h-8 w-[150px] text-sm">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="assigned_to_ta">Assigned to TA</SelectItem>
          <SelectItem value="ta_review_in_progress">In Progress</SelectItem>
          <SelectItem value="submitted_to_admin">Submitted</SelectItem>
          <SelectItem value="admin_changes_requested">Changes Requested</SelectItem>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="h-8 w-[150px] text-sm">
          <SelectValue placeholder="All instructors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dr-patel">Dr. Patel</SelectItem>
          <SelectItem value="prof-nguyen">Prof. Nguyen</SelectItem>
          <SelectItem value="dr-kim">Dr. Kim</SelectItem>
          <SelectItem value="dr-torres">Dr. Torres</SelectItem>
          <SelectItem value="prof-davis">Prof. Davis</SelectItem>
          <SelectItem value="dr-okafor">Dr. Okafor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
