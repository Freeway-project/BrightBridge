"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface CourseFilterBarProps {
  onSearch: (query: string) => void
}

export function CourseFilterBar({ onSearch }: CourseFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          className="pl-8 h-8 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
