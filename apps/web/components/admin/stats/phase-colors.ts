import type { PipelineStage } from "@coursebridge/workflow"

/** Hex colors per pipeline phase, shared by the admin stat charts/breakdown. */
export const PHASE_COLOR: Record<PipelineStage, string> = {
  migration:  "#64748b", // slate
  staging:    "#3b82f6", // blue
  instructor: "#f59e0b", // amber
  provision:  "#10b981", // emerald
}
