"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  listMyConversationsAction,
  getConversationAction,
  markReadAction,
} from "@/lib/chat/actions"
import { ChatSseClient } from "@/app/(dashboard)/chat/_components/ChatSseClient"
import { NewConversationMenu } from "@/app/(dashboard)/chat/_components/NewConversationMenu"
import { ChatWithAdminButton } from "@/app/(dashboard)/chat/_components/ChatWithAdminButton"
import { RelativeTime } from "@/app/(dashboard)/chat/_components/RelativeTime"
import type { ConversationSummary, ConversationDetail, MessageRow } from "@/lib/chat/types"
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
        <div className="border-b border-border px-3 py-2">
          <ChatWithAdminButton />
        </div>
        <ScrollArea className="flex-1">
          <ul>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
                    selectedId === c.id && "bg-muted/60",
                  )}
                >
                  <span className="flex-1 truncate text-sm">{c.displayTitle}</span>
                  <RelativeTime
                    iso={c.lastMessageAt}
                    className="shrink-0 text-xs text-muted-foreground"
                  />
                  {c.unreadCount > 0 && (
                    <Badge variant="secondary">{c.unreadCount}</Badge>
                  )}
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
