import type { ToolTrace } from "./types"

export function logAssistantRequest(fields: {
  userId: string
  role: string
  toolTrace: ToolTrace[]
  latencyMs: number
  outcome: "success" | "error"
  detail?: string
}) {
  console.info(
    "[assistant]",
    JSON.stringify({
      userId: fields.userId,
      role: fields.role,
      tools: fields.toolTrace.map((entry) => entry.tool),
      toolCount: fields.toolTrace.length,
      latencyMs: Math.round(fields.latencyMs),
      outcome: fields.outcome,
      detail: fields.detail,
      at: new Date().toISOString(),
    }),
  )
}
