"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { COURSE_STATUSES, getCourseStatusLabel } from "@coursebridge/workflow"
import { SearchBar } from "@/components/ui/search-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Radix Select forbids empty-string item values, so "all" is the sentinel that
// clears a filter.
const ALL = "all"

export function OrgCourseFilters({
  search,
  status,
  term,
  terms,
}: {
  search: string
  status: string
  term: string
  terms: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(search)

  // Re-sync the input if the URL search changes elsewhere (e.g. back/forward).
  useEffect(() => {
    setValue(search)
  }, [search])

  function setParam(key: string, val: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set(key, val)
    else params.delete(key)
    // Any filter change returns to the first page.
    params.delete("page")
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }))
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchBar
        containerClassName="w-full sm:w-56"
        value={value}
        onValueChange={setValue}
        onSearch={(v) => setParam("search", v || undefined)}
        debounceMs={350}
        placeholder="Search courses…"
        aria-label="Search courses by title, code, term, department, or staff"
        inputClassName="h-8 text-xs md:text-xs"
      />

      <Select value={status || ALL} onValueChange={(v) => setParam("status", v === ALL ? undefined : v)}>
        <SelectTrigger className="h-8 w-full text-xs sm:w-48" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {COURSE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {getCourseStatusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {terms.length > 0 && (
        <Select value={term || ALL} onValueChange={(v) => setParam("term", v === ALL ? undefined : v)}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-36" aria-label="Filter by term">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All terms</SelectItem>
            {terms.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
