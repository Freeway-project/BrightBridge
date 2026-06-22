"use client"

import { useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import { ArrowUp, BarChart3, Bot, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { AssistantMessage, AssistantResponse } from "@/lib/assistant/types"

const STARTER_PROMPTS = [
  "What is blocking approvals right now?",
  "Which units have the most stalled courses?",
  "Show me courses stuck more than 10 days.",
  "Summarize what changed in the last 7 days.",
]

export function AssistantPanel() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about backlog, bottlenecks, unit comparisons, instructor waits, or recent activity. I answer from the current analytics layer only.",
    },
  ])
  const [draft, setDraft] = useState("")
  const [result, setResult] = useState<AssistantResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }]
    setMessages(nextMessages)
    setDraft("")
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        })
        const json = (await response.json()) as AssistantResponse & { error?: string; detail?: string }
        if (!response.ok) {
          throw new Error(json.detail || json.error || "Assistant request failed")
        }

        setResult(json)
        setMessages((current) => [...current, { role: "assistant", content: json.answer }])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assistant request failed")
      }
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Card className="border border-border/60 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-gradient-to-r from-amber-100/70 via-background to-sky-100/60 dark:from-amber-950/30 dark:via-background dark:to-sky-950/30">
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            Analytics Conversation
          </CardTitle>
          <CardDescription>
            Broad questions are fine. The assistant stays inside the current read-only analytics layer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "assistant" ? "mr-8 rounded-2xl border border-border/60 bg-muted/40 p-4" : "ml-8 rounded-2xl bg-primary px-4 py-3 text-primary-foreground"}
              >
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </div>
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                )}
              </div>
            ))}
            {isPending ? (
              <div className="mr-8 flex items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Running analytics tools and drafting the answer.
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submit(prompt)}
                className="rounded-xl border border-border/70 bg-background px-4 py-3 text-left text-sm transition hover:border-foreground/25 hover:bg-muted/40"
                disabled={isPending}
              >
                {prompt}
              </button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t border-border/60 bg-background/70">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask for bottlenecks, rankings, stale courses, recent changes, or workload."
            disabled={isPending}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                submit(draft)
              }
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Send with Ctrl/Cmd+Enter.</p>
            <Button onClick={() => submit(draft)} disabled={isPending || !draft.trim()}>
              Ask Assistant
              <ArrowUp className="size-4" />
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Card className="border border-border/60 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Phase 1 Scope
            </CardTitle>
            <CardDescription>Leadership analytics only. No writes, no raw SQL, no human chat mixing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Good prompts:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Ask why work is slowing down.</li>
              <li>Compare units, backlog, or instructor waits.</li>
              <li>Request recent changes or at-risk course lists.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              Data Used
            </CardTitle>
            <CardDescription>The server chooses from a fixed read-only tool set per question.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {result.toolTrace.map((entry, index) => (
                    <Badge key={`${entry.tool}-${index}`} variant="secondary" className="font-mono text-[11px]">
                      {entry.tool}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Generated: {new Date(result.generatedAt).toLocaleString()}</p>
                  <p>Model: {result.model}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tool traces appear here after the first question.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
