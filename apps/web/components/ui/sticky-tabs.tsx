"use client"

import * as React from "react"
import { Tabs } from "@/components/ui/tabs"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"

type StickyTabsProps = Omit<
  React.ComponentProps<typeof Tabs>,
  "value" | "defaultValue" | "onValueChange"
> & {
  /** Stable id used to remember the active tab in localStorage. */
  storageKey: string
  /** Tab shown before any selection is stored. */
  defaultValue: string
}

/**
 * Drop-in replacement for `<Tabs defaultValue=...>` that remembers the last
 * active tab (per `storageKey`) across reloads and navigation. Children
 * (TabsList / TabsContent) are passed through unchanged, so it works from
 * server components too.
 */
export function StickyTabs({ storageKey, defaultValue, children, ...props }: StickyTabsProps) {
  const [value, setValue] = useStickyTabState(storageKey, defaultValue)
  return (
    <Tabs value={value} onValueChange={setValue} {...props}>
      {children}
    </Tabs>
  )
}
