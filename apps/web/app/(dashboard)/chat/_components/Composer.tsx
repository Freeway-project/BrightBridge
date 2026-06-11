"use client";

import { useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AtSign, Paperclip } from "lucide-react";
import { sendMessageAction } from "@/lib/chat/actions";
import { EmojiPicker } from "./EmojiPicker";

// Attachments are disabled for Phase 1 — the @coursebridge/storage R2 wiring
// isn't in place yet. The backend routes and the AttachmentDropzone component
// stay in the tree so the wiring task is a one-line re-enable here.

export function Composer({
  conversationId,
  parentId = null,
}: {
  conversationId: string;
  parentId?: string | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = textareaRef.current?.value.trim() ?? "";
    if (!body) return;
    if (textareaRef.current) textareaRef.current.value = "";
    await sendMessageAction({
      conversationId,
      body,
      parentId,
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, start) + emoji + ta.value.slice(end);
    const pos = start + emoji.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border p-3 flex flex-col gap-2"
    >
      <Textarea
        ref={textareaRef}
        placeholder="Message…"
        rows={2}
        className="resize-none"
        onKeyDown={handleKeyDown}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <EmojiPicker onPick={insertEmoji} />
          <Button type="button" variant="ghost" size="icon" disabled aria-label="Mention">
            <AtSign className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label="Attach files (disabled — storage not yet wired)"
            title="Attachments coming soon"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
        <Button type="submit" size="sm">
          Send
        </Button>
      </div>
    </form>
  );
}
