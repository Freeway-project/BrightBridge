"use client"

import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { COURSE_STATUS_LABELS, COURSE_STATUSES } from "@coursebridge/workflow"
import { Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CourseSidebarFiltersProps {
  search: string
  status: string
  term: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onTermChange: (value: string) => void
  onClear: () => void
}

export function CourseSidebarFilters({
  search,
  status,
  term,
  onSearchChange,
  onStatusChange,
  onTermChange,
  onClear
}: CourseSidebarFiltersProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2">
        <label htmlFor="search" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Course code or title..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Term
        </label>
        <Select value={term} onValueChange={onTermChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="All Terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="Fall 2025">Fall 2025</SelectItem>
            <SelectItem value="Spring 2026">Spring 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Status
        </label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COURSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {COURSE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        <X className="mr-2 size-4" />
        Clear Filters
      </Button>
    </div>
  )
}
