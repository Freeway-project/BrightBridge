"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationDetail } from "@/lib/chat/types";
import { leaveConversationAction, setNotificationPrefAction } from "@/lib/chat/actions";

export function ConversationHeader({ conversation }: { conversation: ConversationDetail }) {
  const router = useRouter();

  async function handleMute(pref: "all" | "mentions" | "none") {
    await setNotificationPrefAction({ conversationId: conversation.id, pref });
  }

  async function handleLeave() {
    await leaveConversationAction({ conversationId: conversation.id });
    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2 sticky top-0 bg-background z-10">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-sm font-semibold">{conversation.displayTitle}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Users className="h-3 w-3" />
          {conversation.memberCount}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs text-muted-foreground">
            ···
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void handleMute("all")}>Notify: All messages</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void handleMute("mentions")}>Notify: Mentions only</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void handleMute("none")}>Notify: Off</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void handleLeave()}
            className="text-destructive focus:text-destructive"
          >
            Leave conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
