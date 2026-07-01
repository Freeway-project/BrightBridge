"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { MessageRow } from "@/lib/chat/types";
import { formatMessageTime, formatFullDateTime } from "@/lib/chat/format-time";
import { MessageBody } from "./MessageBody";
import { EmojiPicker } from "./EmojiPicker";
import {
  addReactionAction,
  removeReactionAction,
  editMessageAction,
  deleteMessageAction,
} from "@/lib/chat/actions";

export function MessageItem({
  message,
  currentUserId,
  conversationId,
  showHeader,
}: {
  message: MessageRow;
  currentUserId: string;
  conversationId: string;
  showHeader: boolean;
}) {
  const router = useRouter();
  const isOwn = message.authorId === currentUserId;
  const initial = (message.authorName ?? message.authorId).charAt(0).toUpperCase();

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [savingEdit, setSavingEdit] = useState(false);

  async function submitEdit() {
    const body = editBody.trim();
    if (!body || body === message.body) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      await editMessageAction({ messageId: message.id, conversationId, body });
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    await deleteMessageAction({ messageId: message.id, conversationId });
  }

  async function handleReact(emoji: string) {
    const alreadyReacted = message.reactions
      .find((r) => r.emoji === emoji)
      ?.userIds.includes(currentUserId) ?? false;
    if (alreadyReacted) {
      await removeReactionAction({ messageId: message.id, conversationId, emoji });
    } else {
      await addReactionAction({ messageId: message.id, conversationId, emoji });
    }
  }

  function goToThread() {
    router.push(`/chat/${conversationId}/thread/${message.id}`);
  }

  return (
    <div className="group relative flex items-start gap-3 px-4 py-0.5 hover:bg-muted/30">
      {/* Avatar column */}
      <div className="mt-0.5 w-8 shrink-0">
        {showHeader && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-medium leading-none">{message.authorName}</span>
            <span
              className="text-xs text-muted-foreground"
              title={formatFullDateTime(message.createdAt)}
              suppressHydrationWarning
            >
              {formatMessageTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-1">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditBody(message.body); }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs" onClick={() => void submitEdit()} disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditing(false); setEditBody(message.body); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <MessageBody body={message.body} deletedAt={message.deletedAt} />
        )}

        {/* Reaction chips */}
        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => {
              const reacted = r.userIds.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => void handleReact(r.emoji)}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted/70 ${reacted ? "border-primary/40 bg-primary/10" : "border-border bg-muted"}`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!message.deletedAt && !editing && (
        <div className="absolute right-4 top-0.5 hidden group-hover:flex items-center gap-1">
          <EmojiPicker onPick={(emoji) => void handleReact(emoji)} />
          {(!message.parentId || isOwn) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Message actions">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!message.parentId && (
                <DropdownMenuItem onSelect={goToThread}>Reply in thread</DropdownMenuItem>
              )}
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { setEditBody(message.body); setEditing(true); }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleDelete()}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
