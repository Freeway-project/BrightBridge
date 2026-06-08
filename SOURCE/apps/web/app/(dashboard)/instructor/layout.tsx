import type { ReactNode } from "react"
import { InstructorAccessibilityBar } from "@/components/instructor/instructor-accessibility-bar"

/**
 * Instructor-scoped shell. Adds a prominent reading/accessibility toolbar and an
 * `.instructor-surface` wrapper that enlarges controls, text, and spacing for the
 * whole instructor area — distinct from the denser admin/TA UI. Backed by the
 * shared TweakProvider mounted in the dashboard layout.
 */
export default function InstructorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="instructor-surface flex flex-1 flex-col overflow-hidden">
      <InstructorAccessibilityBar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
