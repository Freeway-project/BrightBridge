"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import { sendMessageAction } from "@/lib/chat/actions";
import { EmojiPicker } from "./EmojiPicker";
import { AttachmentDropzone } from "./AttachmentDropzone";

interface Attachment {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export function Composer({
  conversationId,
  parentId = null,
}: {
  conversationId: string;
  parentId?: string | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = textareaRef.current?.value.trim() ?? "";
    if (!body) return;
    if (textareaRef.current) textareaRef.current.value = "";
    const attachments = pendingAttachments;
    setPendingAttachments([]);
    await sendMessageAction({
      conversationId,
      body,
      parentId,
      ...(attachments.length > 0 ? { attachments } : {}),
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
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pendingAttachments.map((a) => (
            <span
              key={a.storageKey}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
            >
              {a.filename}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setPendingAttachments((prev) =>
                    prev.filter((p) => p.storageKey !== a.storageKey),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
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
          <AttachmentDropzone
            onAttach={(attachments) =>
              setPendingAttachments((prev) => [...prev, ...attachments])
            }
          />
        </div>
        <Button type="submit" size="sm">
          Send
        </Button>
      </div>
    </form>
  );
}
