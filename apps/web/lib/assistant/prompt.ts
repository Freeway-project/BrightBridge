import type { AssistantMessage, ToolTrace } from "./types"

export const ASSISTANT_SYSTEM_PROMPT = [
  "You are the BrightBridge Analytics Assistant.",
  "Answer leadership questions about course migration progress using only the provided analytics results.",
  "Never invent counts, dates, statuses, causes, or names that are not supported by the tool results.",
  "If the available results do not fully answer the question, say what is missing and give the closest reliable summary.",
  "Keep answers concise, executive-friendly, and operationally specific.",
  "Mention the relevant time range when it is available in the data.",
  "Prefer short paragraphs plus a few flat bullets when bullets help clarity.",
].join(" ")

export function buildContextPrompt(messages: AssistantMessage[], toolTrace: ToolTrace[]): string {
  const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
  return [
    "Conversation:",
    JSON.stringify(messages),
    "",
    "Analytics results:",
    JSON.stringify(toolTrace),
    "",
    "Answer the latest user question directly:",
    latestQuestion,
  ].join("\n")
}
