"use client"

import { useEffect } from "react"
import { HelpCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useHierarchyTour } from "./hierarchy-guided-tour"

// Auto-launch the tour once per session — so it greets you each time you log in,
// but doesn't re-fire as you click around within the same visit. The bar stays
// as a permanent, friendly "how do I use this" affordance.
const SEEN_KEY = "coursebridge:hierarchy-tour-seen"

export function HierarchyIntro() {
  const { startTour } = useHierarchyTour()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(SEEN_KEY)) return
    sessionStorage.setItem(SEEN_KEY, "1")
    // Wait for first paint so the tour's anchor elements exist.
    const t = setTimeout(() => startTour(), 600)
    return () => clearTimeout(t)
  }, [startTour])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <span className="text-foreground">
          New here?{" "}
          <span className="text-muted-foreground">
            Click any college or department to drill in and see its courses.
          </span>
        </span>
      </div>
      <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" onClick={startTour}>
        <HelpCircle className="size-3.5" /> Show me around
      </Button>
    </div>
  )
}
