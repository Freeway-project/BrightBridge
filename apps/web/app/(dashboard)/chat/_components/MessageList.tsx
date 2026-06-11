"use client";
import { useEffect, useRef } from "react";
import type { MessageRow } from "@/lib/chat/types";
import { MessageItem } from "./MessageItem";

const GROUP_GAP_MS = 5 * 60 * 1000; // 5 minutes

export function MessageList({
  messages,
  currentUserId,
}: {
  messages: MessageRow[];
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledUp.current = distFromBottom > 200;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-0.5 py-4">
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const sameAuthor = prev?.authorId === msg.authorId;
          const withinWindow =
            prev
              ? new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS
              : false;
          const showHeader = !(sameAuthor && withinWindow);
          return (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              showHeader={showHeader}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
