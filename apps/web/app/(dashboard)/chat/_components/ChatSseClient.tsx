"use client";
import { useEffect, useMemo, useReducer } from "react";
import type { ConversationDetail, MessageRow } from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";
import { markReadAction } from "@/lib/chat/actions";
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

const BROADCAST_EVENTS = ["message", "message.edited", "message.deleted", "reaction.added", "reaction.removed"] as const;
type BroadcastEventType = (typeof BROADCAST_EVENTS)[number];

export function ChatSseClient(props: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  conversation: ConversationDetail;
}) {
  const [state, dispatch] = useReducer(reducer, {
    messages: new Map(props.initialMessages.map((m) => [m.id, m])),
  });

  useEffect(() => {
    const supabase = createClient();

    if (supabase) {
      const channel = supabase.channel(`chat:${props.conversationId}`);
      for (const event of BROADCAST_EVENTS) {
        channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
          dispatch({ type: event as BroadcastEventType, payload } as Action);
        });
      }
      channel.subscribe();
      return () => { void supabase.removeChannel(channel); };
    }

    // Fallback: SSE for single-instance deployments without Supabase configured
    const es = new EventSource(`/api/chat/stream/${props.conversationId}`);
    for (const t of BROADCAST_EVENTS) {
      es.addEventListener(t, (ev) => dispatch({ type: t, payload: JSON.parse((ev as MessageEvent).data) } as Action));
    }
    return () => es.close();
  }, [props.conversationId]);

  // Mark the conversation read on open and whenever new messages arrive while viewing,
  // so the sidebar unread badge clears instead of growing forever.
  useEffect(() => {
    void markReadAction({ conversationId: props.conversationId }).catch(() => {});
  }, [props.conversationId, state.messages.size]);

  const messages = useMemo(
    () => [...state.messages.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [state.messages],
  );

  return (
    <>
      <ConversationHeader conversation={props.conversation} />
      <MessageList messages={messages} currentUserId={props.currentUserId} conversationId={props.conversationId} />
      <Composer conversationId={props.conversationId} />
    </>
  );
}
