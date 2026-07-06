"use client"

import { MessageSquare, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ConversationSummary } from "@/lib/chat/types"
import { useOpenChat } from "./ta-dashboard-shell"

interface Props {
  conversations: ConversationSummary[]
}

export function ChatNudgeCard({ conversations }: Props) {
  const openChat = useOpenChat()
  const unread = conversations.filter((c) => c.unreadCount > 0)
  if (unread.length === 0) return null

  const totalUnread = unread.reduce((n, c) => n + c.unreadCount, 0)
  const previews = unread.slice(0, 3)

  return (
    <button
      type="button"
      onClick={() => openChat?.()}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-[var(--ev-600)]/30 bg-card p-5 text-left shadow-[0_0_28px_var(--accent-indigo-glow)]",
        "transition-all duration-200 hover:border-[var(--ev-600)]/60 hover:shadow-[0_0_36px_var(--accent-indigo-glow)]",
      )}
      aria-label={`${totalUnread} unread message${totalUnread !== 1 ? "s" : ""} — open Chat`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--ev-500)]">
          <MessageSquare className="size-3.5" />
          Messages
        </div>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--ev-600)] px-1.5 text-[11px] font-bold leading-none text-white shadow">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      </div>

      {/* Preview list */}
      <ul className="mb-4 space-y-2">
        {previews.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5">
            {/* Unread dot */}
            <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-[var(--ev-500)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">
                  {c.displayTitle}
                </span>
                {c.unreadCount > 1 && (
                  <span className="shrink-0 text-[10px] font-bold text-[var(--ev-500)]">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              {c.lastMessagePreview && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.lastMessagePreview}
                </p>
              )}
            </div>
          </li>
        ))}
        {unread.length > previews.length && (
          <li className="pl-4 text-xs text-muted-foreground/70">
            + {unread.length - previews.length} more conversation{unread.length - previews.length !== 1 ? "s" : ""}
          </li>
        )}
      </ul>

      {/* CTA */}
      <div className="flex items-center justify-end gap-1 text-xs font-semibold text-[var(--ev-500)] group-hover:text-[var(--ev-600)]">
        Open Chat
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}
