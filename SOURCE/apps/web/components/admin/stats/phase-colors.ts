import type { PipelineStage } from "@coursebridge/workflow"

/**
 * Chart fill palette per pipeline phase, shared by the admin stat charts and the
 * Overview phase breakdown. Intentionally a hex palette distinct from the board's
 * Tailwind-class `PHASE_STYLE` (course-list-view.tsx) — that one drives tab-active
 * underline contrast; this one is for neutral-to-warm chart fills.
 */
export const PHASE_COLOR: Record<PipelineStage, string> = {
  migration:  "#64748b", // slate
  staging:    "#3b82f6", // blue
  instructor: "#f59e0b", // amber
  provision:  "#10b981", // emerald
}
