"use client";
import { useEffect, useMemo, useReducer } from "react";
import type { MessageRow } from "@/lib/chat/types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

type State = { messages: Map<string, MessageRow> };
type Action =
  | { type: "ready" }
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
      const m = next.get(a.payload.id); if (m) next.set(m.id, { ...m, body: a.payload.body, editedAt: a.payload.editedAt });
      break;
    }
    case "message.deleted": {
      const m = next.get(a.payload.id); if (m) next.set(m.id, { ...m, body: "", deletedAt: a.payload.deletedAt });
      break;
    }
    case "reaction.added": {
      const m = next.get(a.payload.messageId); if (!m) break;
      const idx = m.reactions.findIndex((r) => r.emoji === a.payload.emoji);
      const updated = idx >= 0
        ? m.reactions.map((r, i) => i === idx ? { ...r, userIds: [...new Set([...r.userIds, a.payload.userId])] } : r)
        : [...m.reactions, { emoji: a.payload.emoji, userIds: [a.payload.userId] }];
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
    case "reaction.removed": {
      const m = next.get(a.payload.messageId); if (!m) break;
      const updated = m.reactions
        .map((r) => r.emoji === a.payload.emoji ? { ...r, userIds: r.userIds.filter((u) => u !== a.payload.userId) } : r)
        .filter((r) => r.userIds.length > 0);
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
  }
  return { messages: next };
}

export function ChatSseClient(props: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
}) {
  const [state, dispatch] = useReducer(reducer, {
    messages: new Map(props.initialMessages.map((m) => [m.id, m])),
  });

  useEffect(() => {
    const es = new EventSource(`/api/chat/stream/${props.conversationId}`);
    const types = ["message", "message.edited", "message.deleted", "reaction.added", "reaction.removed"] as const;
    for (const t of types) {
      es.addEventListener(t, (ev) => dispatch({ type: t, payload: JSON.parse((ev as MessageEvent).data) } as Action));
    }
    return () => es.close();
  }, [props.conversationId]);

  const messages = useMemo(
    () => [...state.messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.messages],
  );

  return (
    <>
      <ConversationHeader conversationId={props.conversationId} />
      <MessageList messages={messages} currentUserId={props.currentUserId} />
      <Composer conversationId={props.conversationId} />
    </>
  );
}
