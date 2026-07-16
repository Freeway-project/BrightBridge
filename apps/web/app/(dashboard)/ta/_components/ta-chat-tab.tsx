"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  listMyConversationsAction,
  getConversationAction,
  markReadAction,
} from "@/lib/chat/actions"
import { getCourseChatInboxAction } from "@/lib/actions/course-chat-actions"
import { ChatSseClient } from "@/app/(dashboard)/chat/_components/ChatSseClient"
import { NewConversationMenu } from "@/app/(dashboard)/chat/_components/NewConversationMenu"
import { ChatWithAdminButton } from "@/app/(dashboard)/chat/_components/ChatWithAdminButton"
import { RelativeTime } from "@/app/(dashboard)/chat/_components/RelativeTime"
import type { ConversationSummary, ConversationDetail, MessageRow } from "@/lib/chat/types"
import type { CourseChatInboxItem } from "@/lib/repositories/contracts"
import { useConversationListRealtime } from "@/lib/chat/use-conversation-list-realtime"

export function TaChatTab({
  userId,
  initialConversations,
  onConversationRead,
}: {
  userId: string
  initialConversations: ConversationSummary[]
  onConversationRead?: () => void
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[] | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<"messages" | "courses">("messages")
  const [courseChats, setCourseChats] = useState<CourseChatInboxItem[] | null>(null)

  useEffect(() => {
    if (tab === "courses" && courseChats === null) {
      getCourseChatInboxAction().then(setCourseChats).catch(() => setCourseChats([]))
    }
  }, [tab, courseChats])

  useConversationListRealtime(userId, selectedId, () => {
    listMyConversationsAction().then(setConversations).catch(() => {})
  })

  async function selectConversation(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    setMessages(null)
    setDetail(null)
    setErr(null)
    setLoading(true)
    // Optimistically clear the per-conversation badge immediately
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    )
    // Mark read in DB and refresh the tab badge
    markReadAction({ conversationId: id })
      .then(() => onConversationRead?.())
      .catch(() => {})
    try {
      const result = await getConversationAction(id)
      setMessages(result.messages)
      setDetail(result.conversation)
    } catch {
      setErr("Failed to load conversation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Conversation list */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Chat</span>
          <NewConversationMenu />
        </div>
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setTab("messages")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium",
              tab === "messages"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setTab("courses")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium",
              tab === "courses"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Courses
          </button>
        </div>
        <div className="border-b border-border px-3 py-2">
          <ChatWithAdminButton />
        </div>
        {tab === "messages" ? (
          <ScrollArea className="min-h-0 flex-1">
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent-indigo-soft",
                      selectedId === c.id &&
                        "bg-accent-indigo-soft ring-1 ring-inset ring-accent-indigo-ring",
                    )}
                  >
                    <span className="flex-1 truncate text-sm">{c.displayTitle}</span>
                    <RelativeTime
                      iso={c.lastMessageAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    />
                    {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
                  </button>
                </li>
              ))}
              {conversations.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet.
                </li>
              )}
            </ul>
          </ScrollArea>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            {courseChats === null ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : courseChats.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No course chats yet.
              </p>
            ) : (
              <ul>
                {courseChats.map((c) => (
                  <li key={c.courseId}>
                    <Link
                      href={`/chat/course/${c.courseId}`}
                      className="flex flex-col gap-0.5 px-3 py-2 hover:bg-accent-indigo-soft"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate text-sm font-medium">{c.courseTitle}</span>
                        <RelativeTime
                          iso={c.lastActivityAt}
                          className="shrink-0 text-xs text-muted-foreground"
                        />
                        {c.unansweredCount > 0 && (
                          <Badge variant="secondary">{c.unansweredCount}</Badge>
                        )}
                      </div>
                      {c.lastPreview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {c.lastAuthorName ? `${c.lastAuthorName}: ` : ""}
                          {c.lastPreview}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}
      </aside>

      {/* Message area */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {err && (
          <div className="flex flex-1 items-center justify-center text-sm text-destructive">
            {err}
          </div>
        )}
        {!loading && !err && selectedId && detail && messages && (
          <ChatSseClient
            conversationId={selectedId}
            currentUserId={userId}
            initialMessages={messages}
            conversation={detail}
          />
        )}
        {!loading && !err && !selectedId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-8 opacity-30" />
            <p className="text-sm">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  )
}
