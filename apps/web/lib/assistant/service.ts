import "server-only"

import type { AppProfile } from "@/lib/auth/context"
import { buildContextPrompt, ASSISTANT_SYSTEM_PROMPT } from "./prompt"
import { logAssistantRequest } from "./logging"
import type {
  AssistantDateRange,
  AssistantMessage,
  AssistantResponse,
  BottleneckBreakdownGroupBy,
  ToolTrace,
  UnitComparisonMetric,
} from "./types"
import {
  compareUnits,
  getBottleneckBreakdown,
  getInstructorWaits,
  getOverviewMetrics,
  getStaffWorkload,
  listStuckCourses,
  summarizeRecentActivity,
} from "./tools"

type ProviderResult = {
  text: string
  model: string
}

function latestUserQuestion(messages: AssistantMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
}

function parseDateRange(question: string): AssistantDateRange {
  const q = question.toLowerCase()
  if (q.includes("last month")) return "last_month"
  if (q.includes("this month")) return "this_month"
  if (q.includes("last 30")) return "last_30_days"
  if (q.includes("last 7") || q.includes("this week") || q.includes("past week")) return "last_7_days"
  return "all_time"
}

function parseNumber(question: string, fallback: number) {
  const match = question.match(/\b(\d{1,3})\b/)
  return match ? Number(match[1]) : fallback
}

function chooseUnitMetric(question: string): UnitComparisonMetric {
  const q = question.toLowerCase()
  if (q.includes("completion")) return "completion_rate"
  if (q.includes("waiting")) return "instructor_waiting_courses"
  if (q.includes("median") || q.includes("age")) return "median_days_open"
  if (q.includes("total") || q.includes("volume")) return "total_courses"
  return "stuck_courses"
}

function chooseBottleneckGroup(question: string): BottleneckBreakdownGroupBy {
  const q = question.toLowerCase()
  if (q.includes("phase")) return "phase"
  if (q.includes("role")) return "blocking_role"
  if (q.includes("department") || q.includes("unit") || q.includes("college") || q.includes("school")) {
    return "org_unit"
  }
  return "status"
}

async function selectToolTrace(messages: AssistantMessage[]): Promise<ToolTrace[]> {
  const question = latestUserQuestion(messages)
  const q = question.toLowerCase()
  const traces: ToolTrace[] = []
  const include = new Set<string>()
  const dateRange = parseDateRange(question)

  const push = async (key: string, loader: () => Promise<ToolTrace>) => {
    if (include.has(key)) return
    include.add(key)
    traces.push(await loader())
  }

  await push("overview", () => getOverviewMetrics(dateRange))

  if (
    q.includes("stuck") ||
    q.includes("risk") ||
    q.includes("behind") ||
    q.includes("bottleneck") ||
    q.includes("blocking")
  ) {
    await push("stuck", () => listStuckCourses(parseNumber(question, 5), 12))
  }

  if (
    q.includes("department") ||
    q.includes("unit") ||
    q.includes("college") ||
    q.includes("school") ||
    q.includes("compare") ||
    q.includes("rank")
  ) {
    await push("units", () => compareUnits(chooseUnitMetric(question), 10))
  }

  if (q.includes("recent") || q.includes("changed") || q.includes("week") || q.includes("month") || q.includes("activity")) {
    await push("activity", () => summarizeRecentActivity(dateRange, 20))
  }

  if (q.includes("bottleneck") || q.includes("blocking") || q.includes("why") || q.includes("slowing")) {
    await push("bottlenecks", () => getBottleneckBreakdown(chooseBottleneckGroup(question)))
  }

  if (q.includes("instructor") || q.includes("approval") || q.includes("waiting")) {
    await push("instructor_waits", () => getInstructorWaits(parseNumber(question, 5), 12))
  }

  if (q.includes("staff") || q.includes("ta") || q.includes("workload") || q.includes("reviewer")) {
    await push("workload", () => getStaffWorkload(12))
  }

  if (traces.length <= 1) {
    await push("units", () => compareUnits("stuck_courses", 8))
    await push("activity", () => summarizeRecentActivity("last_7_days", 12))
    await push("bottlenecks", () => getBottleneckBreakdown("status"))
  }

  return traces
}

async function callAnthropic(messages: AssistantMessage[], toolTrace: ToolTrace[]): Promise<ProviderResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: buildContextPrompt(messages, toolTrace),
        },
      ],
      system: ASSISTANT_SYSTEM_PROMPT,
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`)
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
    model?: string
  }

  const text = json.content?.find((item) => item.type === "text")?.text?.trim()
  if (!text) throw new Error("Anthropic returned empty assistant response")

  return { text, model: json.model ?? "claude-sonnet-4-6" }
}

async function callGroq(messages: AssistantMessage[], toolTrace: ToolTrace[]): Promise<ProviderResult | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
        { role: "user", content: buildContextPrompt(messages, toolTrace) },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    model?: string
  }
  const text = json.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error("Groq returned empty assistant response")

  return { text, model: json.model ?? "llama-3.3-70b-versatile" }
}

function fallbackAnswer(toolTrace: ToolTrace[]): string {
  const overview = toolTrace.find((entry) => entry.tool === "get_overview_metrics")
  const stuck = toolTrace.find((entry) => entry.tool === "list_stuck_courses")
  const units = toolTrace.find((entry) => entry.tool === "compare_units")
  const activity = toolTrace.find((entry) => entry.tool === "summarize_recent_activity")

  const lines: string[] = []
  if (overview?.tool === "get_overview_metrics") {
    lines.push(
      `${overview.output.totalCourses} courses are in scope for ${overview.output.windowLabel}. ${overview.output.completedCourses} are complete, ${overview.output.stuckCourses} are currently at risk, and ${overview.output.instructorWaitingCourses} are sitting in instructor-facing stages.`,
    )
  }
  if (units?.tool === "compare_units" && units.output.length > 0) {
    const top = units.output[0]
    lines.push(`${top.orgUnitName} currently has the highest ${units.input.metric.replaceAll("_", " ")} at ${top.metricValue}.`)
  }
  if (stuck?.tool === "list_stuck_courses" && stuck.output.length > 0) {
    lines.push(`The longest-stalled course in the current result set is ${stuck.output[0].title} at ${stuck.output[0].daysStuck} days.`)
  }
  if (activity?.tool === "summarize_recent_activity" && activity.output.transitionCounts.length > 0) {
    lines.push(`The most common recent transition was ${activity.output.transitionCounts[0]?.label} (${activity.output.transitionCounts[0]?.count} events).`)
  }

  return lines.join(" ")
}

export async function generateAssistantResponse(input: {
  profile: AppProfile
  messages: AssistantMessage[]
}): Promise<AssistantResponse> {
  const started = performance.now()
  const toolTrace = await selectToolTrace(input.messages)

  try {
    const provider =
      (await callAnthropic(input.messages, toolTrace)) ??
      (await callGroq(input.messages, toolTrace)) ?? {
        text: fallbackAnswer(toolTrace),
        model: "deterministic-fallback",
      }

    logAssistantRequest({
      userId: input.profile.id,
      role: input.profile.role,
      toolTrace,
      latencyMs: performance.now() - started,
      outcome: "success",
    })

    return {
      answer: provider.text,
      toolTrace,
      generatedAt: new Date().toISOString(),
      model: provider.model,
    }
  } catch (error) {
    logAssistantRequest({
      userId: input.profile.id,
      role: input.profile.role,
      toolTrace,
      latencyMs: performance.now() - started,
      outcome: "error",
      detail: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
