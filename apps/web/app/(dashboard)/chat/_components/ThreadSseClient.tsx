"use client";
import { useEffect, useMemo, useReducer } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MessageRow } from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";
import { MessageItem } from "./MessageItem";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

type State = { messages: Map<string, MessageRow> };
type Action =
  | { type: "message"; payload: MessageRow }
  | { type: "message.edited"; payload: { id: string; body: string; editedAt: string } }
  | { type: "message.deleted"; payload: { id: string; deletedAt: string } }
  | { type: "reaction.added" | "reaction.removed"; payload: { messageId: string; userId: string; emoji: string } };

function reducer(state: State, a: Action): State {
  const next = new Map(state.messages);
  switch (a.type) {
    case "message": {
      next.set(a.payload.id, { ...a.payload, reactions: a.payload.reactions ?? [], attachments: a.payload.attachments ?? [] });
      break;
    }
    case "message.edited": {
      const m = next.get(a.payload.id);
      if (m) next.set(m.id, { ...m, body: a.payload.body, editedAt: a.payload.editedAt });
      break;
    }
    case "message.deleted": {
      const m = next.get(a.payload.id);
      if (m) next.set(m.id, { ...m, body: "", deletedAt: a.payload.deletedAt });
      break;
    }
    case "reaction.added": {
      const m = next.get(a.payload.messageId);
      if (!m) break;
      const idx = m.reactions.findIndex((r) => r.emoji === a.payload.emoji);
      const updated =
        idx >= 0
          ? m.reactions.map((r, i) =>
              i === idx ? { ...r, userIds: [...new Set([...r.userIds, a.payload.userId])] } : r,
            )
          : [...m.reactions, { emoji: a.payload.emoji, userIds: [a.payload.userId] }];
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
    case "reaction.removed": {
      const m = next.get(a.payload.messageId);
      if (!m) break;
      const updated = m.reactions
        .map((r) =>
          r.emoji === a.payload.emoji
            ? { ...r, userIds: r.userIds.filter((u) => u !== a.payload.userId) }
            : r,
        )
        .filter((r) => r.userIds.length > 0);
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
  }
  return { messages: next };
}

export function ThreadSseClient({
  conversationId,
  parentId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  parentId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    messages: new Map(initialMessages.map((m) => [m.id, m])),
  });

  useEffect(() => {
    const supabase = createClient();

    if (supabase) {
      const channel = supabase.channel(`chat:${conversationId}`);
      channel.on("broadcast", { event: "message" }, ({ payload }: { payload: MessageRow }) => {
        if (payload.parentId === parentId) dispatch({ type: "message", payload });
      });
      channel.on("broadcast", { event: "message.edited" }, ({ payload }) => {
        dispatch({ type: "message.edited", payload });
      });
      channel.on("broadcast", { event: "message.deleted" }, ({ payload }) => {
        dispatch({ type: "message.deleted", payload });
      });
      channel.on("broadcast", { event: "reaction.added" }, ({ payload }) => {
        dispatch({ type: "reaction.added", payload });
      });
      channel.on("broadcast", { event: "reaction.removed" }, ({ payload }) => {
        dispatch({ type: "reaction.removed", payload });
      });
      channel.subscribe();
      return () => { void supabase.removeChannel(channel); };
    }

    const es = new EventSource(`/api/chat/stream/${conversationId}`);
    es.addEventListener("message", (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data) as MessageRow;
      if (payload.parentId === parentId) dispatch({ type: "message", payload });
    });
    (["message.edited", "message.deleted", "reaction.added", "reaction.removed"] as const).forEach((t) => {
      es.addEventListener(t, (ev) =>
        dispatch({ type: t, payload: JSON.parse((ev as MessageEvent).data) }),
      );
    });
    return () => es.close();
  }, [conversationId, parentId]);

  const allMessages = useMemo(
    () => [...state.messages.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [state.messages],
  );

  const parentMsg = allMessages.find((m) => m.id === parentId) ?? allMessages[0];
  const replies = allMessages.filter((m) => m.parentId === parentId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => router.push(`/chat/${conversationId}`)}
          aria-label="Back to conversation"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">Thread</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Parent message */}
        {parentMsg && (
          <div className="border-b border-border py-2">
            <MessageItem
              message={parentMsg}
              currentUserId={currentUserId}
              conversationId={conversationId}
              showHeader
            />
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 ? (
          <>
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
            </div>
            <MessageList
              messages={replies}
              currentUserId={currentUserId}
              conversationId={conversationId}
            />
          </>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No replies yet. Start the thread below.
          </p>
        )}
      </div>

      <Composer conversationId={conversationId} parentId={parentId} />
    </div>
  );
}
