"use client";

import { Smile } from "lucide-react";
import { EmojiPicker as FrimousseEmojiPicker } from "frimousse";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Emoji } from "frimousse";

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Emoji">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="top">
        <FrimousseEmojiPicker.Root
          onEmojiSelect={(emoji: Emoji) => onPick(emoji.emoji)}
          className="h-80 w-72"
        >
          <FrimousseEmojiPicker.Search
            className="w-full border-b px-3 py-2 text-sm outline-none"
            placeholder="Search emoji…"
          />
          <FrimousseEmojiPicker.Viewport className="flex-1 overflow-y-auto p-1" />
        </FrimousseEmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
