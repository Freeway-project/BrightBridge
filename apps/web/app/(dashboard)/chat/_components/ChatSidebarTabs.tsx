"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./RelativeTime";
import type { ConversationSummary } from "@/lib/chat/types";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

export function ChatSidebarTabs({
  conversations,
  courseChats,
}: {
  conversations: ConversationSummary[];
  courseChats: CourseChatInboxItem[];
}) {
  const [tab, setTab] = useState<"messages" | "courses">("messages");
  const unansweredTotal = courseChats.reduce((n, c) => n + c.unansweredCount, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-border">
        <TabButton active={tab === "messages"} onClick={() => setTab("messages")}>
          Messages
        </TabButton>
        <TabButton active={tab === "courses"} onClick={() => setTab("courses")}>
          Courses
          {unansweredTotal > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unansweredTotal}
            </Badge>
          )}
        </TabButton>
      </div>
      <ScrollArea className="flex-1">
        {tab === "messages" ? (
          <MessagesList conversations={conversations} />
        ) : (
          <CoursesList courseChats={courseChats} />
        )}
      </ScrollArea>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 px-3 py-2 text-sm font-medium",
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MessagesList({ conversations }: { conversations: ConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No conversations yet.
      </p>
    );
  }
  return (
    <ul>
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/${c.id}`}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40"
          >
            <span className="flex-1 truncate text-sm">{c.displayTitle}</span>
            <RelativeTime
              iso={c.lastMessageAt}
              className="shrink-0 text-xs text-muted-foreground"
            />
            {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CoursesList({ courseChats }: { courseChats: CourseChatInboxItem[] }) {
  if (courseChats.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No course chats yet.
      </p>
    );
  }
  return (
    <ul>
      {courseChats.map((c) => (
        <li key={c.courseId}>
          <Link
            href={`/chat/course/${c.courseId}`}
            className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm font-medium">{c.courseTitle}</span>
              <RelativeTime
                iso={c.lastActivityAt}
                className="shrink-0 text-xs text-muted-foreground"
              />
              {c.unansweredCount > 0 && <Badge variant="secondary">{c.unansweredCount}</Badge>}
            </div>
            {c.lastPreview && (
              <span className="truncate text-xs text-muted-foreground">
                {c.lastAuthorName ? `${c.lastAuthorName}: ` : ""}
                {c.lastPreview}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
