"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { MessageRow } from "@/lib/chat/types";
import { MessageBody } from "./MessageBody";

export function MessageItem({
  message,
  currentUserId,
  showHeader,
}: {
  message: MessageRow;
  currentUserId: string;
  showHeader: boolean;
}) {
  const isOwn = message.authorId === currentUserId;
  const initial = message.authorId.charAt(0).toUpperCase();

  return (
    <div className="group relative flex items-start gap-3 px-4 py-0.5 hover:bg-muted/30">
      {/* Avatar column — always takes space to keep alignment */}
      <div className="mt-0.5 w-8 shrink-0">
        {showHeader && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-medium leading-none">{message.authorId.slice(0, 8)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        <MessageBody body={message.body} deletedAt={message.deletedAt} />

        {/* Reaction chips */}
        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs hover:bg-muted/70"
                onClick={() => {}}
                type="button"
              >
                <span>{r.emoji}</span>
                <span>{r.userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-4 top-0.5 hidden group-hover:flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Message actions">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => {}}>Reply in thread</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}}>React</DropdownMenuItem>
            {isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {}}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {}} className="text-destructive focus:text-destructive">
                  Delete
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => {}}>Copy link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
