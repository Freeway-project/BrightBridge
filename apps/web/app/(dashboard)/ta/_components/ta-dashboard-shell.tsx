"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { BookOpen, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { TaChatTab } from "./ta-chat-tab"
import { useChatUnreadCount } from "@/hooks/use-chat-unread-count"
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
  const { count: unread, bump } = useChatUnreadCount(userId)

  function handleTabClick(id: TabId) {
    setTab(id)
  }

  return (
    <TweakableContent className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-4">

        {/* My Courses tab */}
        <button
          type="button"
          onClick={() => handleTabClick("courses")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
            tab === "courses"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <BookOpen className="size-3.5" aria-hidden />
          My Courses
        </button>

        {/* Chat tab — with live unread badge */}
        <button
          type="button"
          onClick={() => handleTabClick("chat")}
          className={cn(
            "relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
            tab === "chat"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <MessageSquare className="size-3.5" aria-hidden />
          Chat
          {unread > 0 && (
            <span
              key={bump}
              className="ml-0.5 inline-flex h-[18px] min-w-[18px] animate-in zoom-in-50 duration-200 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-md"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          {/* Pulse ring on new message */}
          {bump > 0 && tab !== "chat" && (
            <span
              key={`ring-${bump}`}
              className="absolute right-1 top-1.5 size-2 rounded-full bg-red-500 animate-ping"
            />
          )}
        </button>

      </div>

      {/* Content area */}
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
