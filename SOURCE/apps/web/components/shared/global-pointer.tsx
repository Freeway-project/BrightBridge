"use client"

import { Pointer } from "@/components/ui/pointer"

/** Mounts the global emoji cursor over the entire app. */
export function GlobalPointer() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <Pointer />
    </div>
  )
}
