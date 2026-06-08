"use client";
import { useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Smile, AtSign, Paperclip } from "lucide-react";
import { sendMessageAction } from "@/lib/chat/actions";

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
    await sendMessageAction({ conversationId, body, parentId });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
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
          <Button type="button" variant="ghost" size="icon" disabled aria-label="Emoji">
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled aria-label="Mention">
            <AtSign className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled aria-label="Attach">
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
