"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { BookOpen, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { TaChatTab } from "./ta-chat-tab"
import type { ConversationSummary } from "@/lib/chat/types"

type TabId = "courses" | "chat"

export function TaDashboardShell({
  userId,
  initialConversations,
  coursesContent,
}: {
  userId: string
  initialConversations: ConversationSummary[]
  coursesContent: ReactNode
}) {
  const [tab, setTab] = useState<TabId>("courses")

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "courses", label: "My Courses", icon: <BookOpen className="size-3.5" aria-hidden /> },
    { id: "chat",    label: "Chat",       icon: <MessageSquare className="size-3.5" aria-hidden /> },
  ]

  return (
    <TweakableContent className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content area — each tab fills remaining height */}
      {tab === "courses" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {coursesContent}
        </div>
      )}
      {tab === "chat" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <TaChatTab userId={userId} initialConversations={initialConversations} />
        </div>
      )}
    </TweakableContent>
  )
}
