"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { BookOpen, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { TaChatTab } from "./ta-chat-tab"
import { useChatUnreadCount } from "@/hooks/use-chat-unread-count"
import type { ConversationSummary } from "@/lib/chat/types"

type TabId = "courses" | "chat"

const OpenChatContext = createContext<(() => void) | null>(null)

export function useOpenChat() {
  return useContext(OpenChatContext)
}

export function TaDashboardShell({
  userId,
  initialConversations,
  coursesContent,
}: {
  userId: string
  initialConversations: ConversationSummary[]
  coursesContent: ReactNode
}) {
  const [tab, setTab] = useStickyTabState("ta-dashboard", "courses") as [TabId, (t: TabId) => void]
  const { count: unread, bump, refresh: refreshUnreadCount } = useChatUnreadCount(userId)

  function handleTabClick(id: TabId) {
    setTab(id)
  }

  return (
    <TweakableContent className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">

        {/* My Courses tab */}
        <button
          type="button"
          onClick={() => handleTabClick("courses")}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
            tab === "courses"
              ? "bg-accent-indigo-hover text-white shadow-sm ring-1 ring-inset ring-white/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <BookOpen className="size-4" aria-hidden />
          My Courses
        </button>

        {/* Chat tab — with live unread badge */}
        <button
          type="button"
          onClick={() => handleTabClick("chat")}
          className={cn(
            "relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
            tab === "chat"
              ? "bg-accent-indigo-hover text-white shadow-sm ring-1 ring-inset ring-white/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <MessageSquare className="size-4" aria-hidden />
          Chat
          {unread > 0 && (
            <span
              key={bump}
              className={cn(
                "ml-0.5 inline-flex h-5 min-w-[20px] animate-in zoom-in-50 duration-200 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none shadow-md",
                tab === "chat"
                  ? "bg-white/30 text-white"
                  : "bg-red-500 text-white",
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          {/* Pulse ring on new message while tab is inactive */}
          {bump > 0 && tab !== "chat" && (
            <span
              key={`ring-${bump}`}
              className="absolute right-1 top-1 size-2.5 rounded-full bg-red-500 animate-ping"
            />
          )}
        </button>

      </div>

      {/* Content area */}
      <OpenChatContext.Provider value={() => handleTabClick("chat")}>
        {tab === "courses" && (
          <div className="min-h-0 flex-1 overflow-hidden">
            {coursesContent}
          </div>
        )}
      </OpenChatContext.Provider>
      {tab === "chat" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <TaChatTab userId={userId} initialConversations={initialConversations} onConversationRead={refreshUnreadCount} />
        </div>
      )}
    </TweakableContent>
  )
}
