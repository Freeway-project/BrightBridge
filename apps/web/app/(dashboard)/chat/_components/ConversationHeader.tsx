"use client";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ConversationHeader({ conversationId: _conversationId }: { conversationId: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2 sticky top-0 bg-background z-10">
      <span className="text-sm font-semibold">Conversation</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Conversation settings">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => {}}>Mute: All</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {}}>Mute: Mentions</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {}}>Mute: None</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => {}}>Add members</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {}}>Leave conversation</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
