"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationControlsProps {
  page: number
  totalPages: number
  totalItems: number
}

export function PaginationControls({ page, totalPages, totalItems }: PaginationControlsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function createPageURL(pageNumber: number | string) {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) {
    return (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-muted-foreground">Showing all {totalItems} results</p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({totalItems} total)
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={page <= 1 ? "#" : createPageURL(page - 1)} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <ChevronLeft className="size-4 mr-1" /> Previous
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link href={page >= totalPages ? "#" : createPageURL(page + 1)} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
            Next <ChevronRight className="size-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
